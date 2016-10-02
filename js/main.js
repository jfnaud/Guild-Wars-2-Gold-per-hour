//Guild Wars 2 - Gold per Hour
//
//Tool using the official ArenaNet API to estimate the average gold per hour a player makes while playing Guild Wars 2.
//
//GitHub repository : https://github.com/jfnaud/Guild-Wars-2-Gold-per-hour
//Created by : Deviljeff.1946
//September 2015

(function () {
//Constants
    //After how many ticks shall we fetch the data again
    var REFRESH_RATE = 180;
    //Animation duration - used for all animations
    var ANIMATION_DURATION = 200;
    //Sound effect
    var SOUND_EFFECT = new Audio('sounds/ding.mp3');

//Variables
    //Application started on
    var startedOn;      //First start
    var initiatedOn;    //Updated when resuming
    //Timer variables
    var keepGoing = true;
    var intervalCount = 0;
    var totalElapsedTime = 1;   //Total time that the graph is updating
    var timeElapsed;            //Time elapsed the last "start" or "resume"
    //API key
    var token = '';
    //Initial gold
    var initialGold = 0;
    //Current gold
    var currentGold = 0;
    //Index of all the items owned by the account when the application is started (used for later comparisons)
    var initialIndex = {};
    //Index of all the current items owned by the account
    var currentIndex = {};
    //Index of all the new items acquired since the launch of the application
    var newItems = {};
    //Index of all the items that were deleted from the account since the launch of the application
    var oldItems = {};
    //Interval ID of the refresh
    var refreshID;
    //Gains and losses since the start
    var gains = 0;
    var losses = 0;
    //List of item types to display
    var itemTypes = [];
    //Gold per hour graph
    var goldPerHourSeries;
    var goldSeries;
    //Currencies graph
    var currenciesGraph;

    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });
    //Are we currently updating the page? Used to avoid spikes on the graph
    var updating = false;
    //Other currencies
    var currenciesOrder = {
        4: 1,   //Gems
        2: 2,   //Karma
        23: 3,  //Spirit shards
        3: 4,   //Laurels
        18: 5,  //Transmutation charges
        15: 6,  //Badges of honor
        7: 7,   //Fractal relics
        24: 8,  //Pristine fractal relics
        16: 9,  //Guild commendations
        25: 10, //Geodes
        27: 11, //Bandit crests

        19: 12, //Airship parts
        22: 13, //Lumps of aurilium
        20: 14, //Ley line crystals
        28: 15, //Magnetite shards
        32: 16, //Unbound magic
        30: 17, //PvP league tickets
        31: 18, //Proof of heroics

        5: 19,  //AC
        9: 20,  //CM
        11: 21, //TA
        10: 22, //SE
        13: 23, //CoF
        12: 24, //HotW
        14: 25, //CoE
        6: 26,  //Arah
        
        26: 27, //WvW claim tickets
        29: 28  //Provisionner tokens
    };
    var initialCurrencies = [];
    var currentCurrencies = [];
    //Current version of the application
    var currentVersion;
    var checkVersion = true;
    var fetchCount = 0;

    //Utility function for padding zeroes when displaying gold
    String.prototype.paddingLeft = function (paddingValue) {
        return String(paddingValue + this).slice(-paddingValue.length);
    };

    //Utility function to format numbers
    Number.prototype.format = function(n, x) {
        var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
        return this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$&,');
    };

    //Utility function to get the API key via the "key" parameter in the URL
    function getKeyFromURL() {
        var sPageURL = decodeURIComponent(window.location.search.substring(1));
        var sURLVariables = sPageURL.split('&');
        var sParameterName;
        var i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0].toLowerCase() === 'key') {
                $('#apiKey').val(sParameterName[1]);
                if(localStorage.getItem('saveAPIKey') === 'true') {
                    localStorage.setItem('saveAPIKey', sParameterName[1]);
                }
            }
        }
    };

//Launching the app
    //Restore API key and settings from the localStorage
    if (localStorage.getItem('saveAPIKey') === null) {
        localStorage.setItem('saveAPIKey', true);
    }
    $('#saveAPIKey').prop('checked', (localStorage.getItem('saveAPIKey') === 'true' ? true : false));

    if(localStorage.getItem('saveAPIKey') === 'true') {
        $('#apiKey').val(localStorage.getItem('APIKey'));
    }

    //... or from the URL via the "key" argument
    getKeyFromURL();

    //Show item details?
    if (localStorage.getItem('showDetails') === null) {
        localStorage.setItem('showDetails', true);
    }
    $('#toggleDetails').prop('checked', (localStorage.getItem('showDetails') === 'true' ? true : false));

    //Play a sound?
    if (localStorage.getItem('playSound') === null) {
        localStorage.setItem('playSound', false);
    }
    $('#toggleSound').prop('checked', (localStorage.getItem('playSound') === 'true' ? true : false));

    //Sort by
    if (localStorage.getItem('sortBy') === null) {
        localStorage.setItem('sortBy', 'rarity');
    }
    if (localStorage.getItem('sortBy') === 'value') {
        $('#sortByValue').prop('checked', true);
    } else {
        $('#sortByRarity').prop('checked', true);
    }

    //"Value from"
    if (localStorage.getItem('valueFrom') === null) {
        localStorage.setItem('valueFrom', 'lowestSeller');
    }
    if (localStorage.getItem('valueFrom') === 'highestBuyer') {
        $('#highestBuyer').prop('checked', true);
    } else {
        $('#lowestSeller').prop('checked', true);
    }

    //"Base time on"
    if (localStorage.getItem('baseTime') === null) {
        localStorage.setItem('baseTime', 'sinceStart');
    }
    if (localStorage.getItem('baseTime') === 'elapsed') {
        $('#elapsed').prop('checked', true);
    } else {
        $('#sinceStart').prop('checked', true);
    }

    //Allowed item types
    if (localStorage.getItem('itemTypes') === null) {
        localStorage.setItem('itemTypes', $.map($('.itemType'), function (n) {
            return '#' + $(n).attr('id');
        }).join(', '));
    }
    $('' + localStorage.getItem('itemTypes')).prop('checked', true).each(function() {
        itemTypes.push($(this).data('type'));
    });

    //Ignore value of discarded item types
    if (localStorage.getItem('ignoreHidden') === null) {
        localStorage.setItem('ignoreHidden', false);
    }
    $('#ignoreHidden').prop('checked', (localStorage.getItem('ignoreHidden') === 'true' ? true : false));

    //Get the current version of the application
    $.getJSON('https://jfnaud.github.io/Guild-Wars-2-Gold-per-hour/currentVersion.json').done(function(json) {
        currentVersion = json.number;
        $('#currentVersion').html(currentVersion);

        if(localStorage.getItem('currentVersion') && localStorage.getItem('currentVersion') != currentVersion) {
            $('#newVersion').html('Since the last time you came here, I updated the application. See what\'s new <a href="https://github.com/jfnaud/Guild-Wars-2-Gold-per-hour/blob/master/CHANGELOG.md" target="_blank" alt="changelog">here</a>! <span class="close first">Got it!</span>').show().position({my: 'center top', at: 'center top', of: window});
        }

        localStorage.setItem('currentVersion', currentVersion);
    });

    // automatically load main if stored API key 
    if ($('#apiKey').val().length > 0) {
        token = $('#apiKey').val();
        //Save the API key for future use
        localStorage.setItem('APIKey', token);

        $('#intro').hide();
        $('#main, #menu').show();

        init();
    }

//Functions
    //Initialisation. Called after the user enters his API key and also when the user clicks the restart button.
    function init() {
        var goldGraph;

        //Reset variables
        startedOn = Date.now();
        initiatedOn = Date.now();
        timeElapsed = 0;
        initialIndex = {};
        currentIndex = {};
        gains = 0;
        losses = 0;
        intervalCount = 0;
        keepGoing = true;

        //Show / hide / reset dom
        $('#gridNew, #gridOld').html('');
        $('#newItems .none, #oldItems .none').show();
        $('#totalNew, #totalOld').hide();
        $('#startOver, #resume').hide();
        $('#stop').show();
        $('#startTime').html(new Date().toLocaleString());
        $('#currentTime').html(new Date().toLocaleString());

        //Graph of the gold per hour
        goldGraph = $('#chart').highcharts('StockChart', {
            chart: {
                animation: Highcharts.svg, // don't animate in old IE
                marginLeft: 110,
                marginRight: 110,
                height: 350
            },
            plotOptions: {
                series: {
                    dataGrouping: {
                        groupPixelWidth: 1
                    },
                    marker: {
                        enabled: null,
                        radius: 3
                    },
                    states: {
                        hover: {
                            enabled: false
                        }
                    }
                }
            },
            series: [{
                name: 'Gold per hour',
                data: [[(new Date()).getTime(), 0]],
                yAxis: 0
            }, {
                name: 'Total acquired gold',
                data: [[(new Date()).getTime(), 0]],
                yAxis: 1
            }],
            title: {
                text: 'Gold over time'
            },
            xAxis: {
                tickPixelInterval: 150
            },
            yAxis: [{
                labels: {
                    useHTML: true,
                    formatter: function() {
                        return '<span style="white-space: nowrap; color: #7CB5EC;">' + displayGold(this.value, false) + '</span>';
                    }
                },
                opposite: false
            }, {
                labels: {
                    align: 'right',
                    x: 95,
                    useHTML: true,
                    formatter: function() {
                        return '<span style="white-space: nowrap; color: #434348;">' + displayGold(this.value, false) + '</span>';
                    }
                },
                opposite: true
            }],
            tooltip: {
                hideDelay: 0,
                animation: false,
                formatter: function () {
                    return '<b>' + this.points[0].series.name + '</b><br/>' +
                        Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) + '<br/>' +
                        '<div style="white-space: nowrap">' + displayGold(this.y) + '</div>';
                },
                useHTML: true
            },
            exporting: {
                enabled: false
            },
            legend: {
                enabled: true
            },
            navigator: {
                enabled: false
            },
            rangeSelector: {
                enabled: false
            },
            scrollbar: {
                enabled: false
            }
        });
        goldPerHourSeries = goldGraph.highcharts().series[0];
        goldSeries = goldGraph.highcharts().series[1];

        //Fetch all currencies
        $.getJSON('https://api.guildwars2.com/v2/currencies?ids=2,3,4,5,6,7,9,10,11,12,13,14,15,16,18,19,20,22,23,24,25,26,27,28,29,30,31,32&lang=en').done(function(currencies) {
            var graphSeries = [];

            currencies.sort(function(a, b) {
                if(currenciesOrder[a.id] > currenciesOrder[b.id]) {
                    return 1;
                } else if(currenciesOrder[a.id] < currenciesOrder[b.id]) {
                    return -1;
                } else {
                    return 0;
                }
            });

            $('#currencies').html('<table><tr><th><input type="checkbox" id="checkAllCurrencies"></th><th>Currency</th><th>Initial</th><th>Current</th><th>Difference</th></tr></table>');

            currencies.forEach(function(currency) {
                $('#currencies table').append('<tr data-currencyID="' + currency.id + '">' +
                        '<td><input class="currencySelect" type="checkbox" value="' + currency.id + '" id="currency-' + currency.id +'"></td>' + 
                        '<td><label for="currency-' + currency.id + '"><img width="25" height="25" src="' + currency.icon + '" alt="' + currency.name + '"> ' + currency.name + '</label></td>' +
                        '<td class="initialCurrencyValue">0</td><td class="currentCurrencyValue">0</td><td class="currencyDifference">0</td>' +
                        '</tr>');

                graphSeries.push({id: 'currency-' + currency.id, name: currency.name, data: [], visible: false});
            });

            //Restore the series from the localStorage
            if (localStorage.getItem('currencies') === null) {
                localStorage.setItem('currencies', $.map($('.currencySelect'), function (n) {
                    return '#' + $(n).attr('id');
                }).join(', '));
            }
            $('' + localStorage.getItem('currencies')).prop('checked', true).each(function(index, item) {
                graphSeries.forEach(function(series) {
                    if(series.id == $(item).attr('id')) {
                        series.visible = true;
                    }
                });
            });

            //Other currencies graph
            currenciesGraph = $('#currenciesGraph').highcharts('StockChart', {
                chart: {
                    animation: Highcharts.svg, // don't animate in old IE
                    marginRight: 10,
                    height: 500
                },
                plotOptions: {
                    series: {
                        dataGrouping: {
                            groupPixelWidth: 1
                        },
                        marker: {
                            enabled: null,
                            radius: 3
                        },
                        states: {
                            hover: {
                                enabled: false
                            }
                        }
                    }
                },
                series: graphSeries,
                title: {
                    text: 'Currencies acquisition over time'
                },
                xAxis: {
                    tickPixelInterval: 150
                },
                yAxis: {
                    opposite: false
                },
                tooltip: {
                    hideDelay: 0,
                    animation: false,
                    headerFormat: '<small>{point.key}</small><table>',
                    pointFormat: '<tr><td style="color: {series.color}">{series.name}: </td>' +
                        '<td style="text-align: right"><b>{point.y}</b></td></tr>',
                    footerFormat: '</table>',
                    useHTML: true
                },
                exporting: {
                    enabled: false
                },
                legend: {
                    enabled: false
                },
                navigator: {
                    enabled: false
                },
                rangeSelector: {
                    enabled: false
                },
                scrollbar: {
                    enabled: false
                }
            });
        }).fail(failedRequest);

        //Get initial gold
        $.getJSON('https://api.guildwars2.com/v2/account/wallet?access_token=' + token).done(function (wallet) {
            initialGold = wallet[0].value;
            currentGold = wallet[0].value;
            //Display the initial amount of gold
            $('#initialGold').html(displayGold(initialGold));
            $('#currentGold').html(displayGold(initialGold));

        }).fail(failedRequest).then(function() {
            //Fetch the items for the first time. This will build an index of the initial items that will be used later to compare and find the new/lost items.
            fetchAll(true);

            //Start the loop. This will tick once every second.
            tick();
        });
    }

    //Handles failed request
    function failedRequest(jqxhr) {
        var json = JSON.parse(jqxhr.responseText);
        var errorMessage = (json.text ? json.text : json.error);

        if (jqxhr.status === 400 || jqxhr.status === 503) {
            $('#warning').html('<b>Oops!</b> The Guild Wars 2 API is currently not working... # ' + errorMessage + ' # <span class="close">Close</span>');
        } else if(jqxhr.status === 403) {
            $('#warning').html('<b>Oops!</b> It looks like the API key you specified is invalid. Please make sure you granted all the necessary permissions. # ' + errorMessage + ' # <span class="close">Close</span>');
        } else if (jqxhr.status === 404) {
            $('#warning').html('<b>Oops!</b> A call to an API endpoint was made to an invalid endpoint or to one with an invalid item ID. # ' + errorMessage + ' # <span class="close">Close</span>');
        } else if (jqxhr.status === 408) {
            $('#warning').html('<b>Oops!</b> A call to an API endpoint took too long to complete. Please check your Internet connection. # ' + errorMessage + ' # <span class="close">Close</span>');
        } else {
            $('#warning').html('<b>Oops!</b> Something went wrong. # ' + errorMessage + ' # <span class="close">Close</span>');
        }

        $('#warning').show().position({my: 'left bottom', at: 'left bottom', of: window});
    }

    //Main loop. Calls itself every second. When the countdown reaches 0, it fetches the current items and updates the page.
    function tick() {
        if(keepGoing) {
            var minutes, seconds, elapsed;

            //Compute and display the time remaining until the next refresh
            remaining = REFRESH_RATE - intervalCount;
            minutes = (remaining / 60) | 0;
            seconds = (remaining % 60) | 0;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            $('#countdown').html('Next refresh: ' + minutes + ':' + seconds);

            //Update the gold per hour and the chart
            updateTotal();

            intervalCount++;
            //When reaching 0, fetch everything and compare with the initial items/gold
            if (intervalCount === REFRESH_RATE) {
                intervalCount = 0;
                fetchAll(false);
            }

            //Adjust the next tick
            var diff = (Date.now() - initiatedOn) - timeElapsed;
            timeElapsed += 1000;
            totalElapsedTime += 1000;

            window.setTimeout(tick, (1000 - diff));
        }
    }

    //Updates the summary section, as well as the chart
    function updateTotal() {
        //Don't do anything if we are currently fetching data and not everything is ready
        if(!updating) {
            var timeDiff;
            var goldDiff = currentGold - initialGold;
            var goldPerHour;

            if(localStorage.getItem('baseTime') === 'elapsed') {
                timeDiff = 3600000 / totalElapsedTime;
            } else {
                timeDiff = 3600000 / (Date.now() - startedOn);
            }

            $('#totalNew').html('Gains (' + (localStorage.getItem('valueFrom') === 'lowestSeller' ? 'listing' : 'sell instantly') + ', before fees): <span class="price">' + displayGold(gains) + '</span>' +
                    '<br>Listing and selling fees (15%): <span class="price">' + displayGold(parseInt(gains * 0.15)) + '</span>' +
                    '<br>Result: <span class="price">' + displayGold(gains - parseInt(gains * 0.15)) + '</span>');

            $('#totalOld').html('Losses (' + (localStorage.getItem('valueFrom') === 'lowestSeller' ? 'listing' : 'sell instantly') + ', before fees): <span class="price">' + displayGold(losses) + '</span>' +
                    '<br>Listing and selling fees (15%): <span class="price">' + displayGold(parseInt(losses * 0.15)) + '</span>' +
                    '<br>Result: <span class="price">' + displayGold(losses - parseInt(losses * 0.15)) + '</span>');

            goldPerHour = parseInt(((gains - parseInt(gains * 0.15)) - (losses - parseInt(losses * 0.15)) + goldDiff) * timeDiff);

            //Change color based on gains or losses
            if (goldPerHour > 0) {
                $('#summary').addClass('positive').removeClass('negative');
                $('#main').addClass('overlayPositive').removeClass('overlayNegative');
            } else if(goldPerHour < 0) {
                $('#summary').addClass('negative').removeClass('positive');
                $('#main').addClass('overlayNegative').removeClass('overlayPositive');
            } else {
                $('#summary').removeClass('positive negative');
                $('#main').removeClass('overlayPositive overlayNegative');
            }

            $('#overallGoldDifference').html(displayGold(goldDiff));
            $('#currentGold').html(displayGold(currentGold));
            $('#overallGains').html(displayGold(gains));
            $('#overallFees').html(displayGold(parseInt(gains * 0.15)));
            $('#overallLosses').html(displayGold(losses - parseInt(losses * 0.15)));
            $('#overallResult').html(displayGold((gains - parseInt(gains * 0.15)) - (losses - parseInt(losses * 0.15)) + goldDiff));
            $('#overallAverage').html(displayGold(goldPerHour));

            //Update the chart. Highstock will group the data over time
            if(!isNaN(goldPerHour)) {
                goldPerHourSeries.addPoint([(new Date()).getTime(), goldPerHour], true, false);
            }
        }
    }

    //This function fetches everything currently associated with the account. The "first" parameter is only used to build the initialIndex when the application is started.
    function fetchAll(first) {
        newItems = {};
        oldItems = {};
        currentIndex = {};

        fetchCount++;

        if(checkVersion && fetchCount === 10) {
            fetchCount = 0;
            //Get the current version of the application and compare
            $.getJSON('https://jfnaud.github.io/Guild-Wars-2-Gold-per-hour/currentVersion.json').done(function(json) {
                if(currentVersion !== json.number) {
                    $('#newVersion').html('A new version of the application is now available (<a href="https://github.com/jfnaud/Guild-Wars-2-Gold-per-hour/blob/master/CHANGELOG.md" target="_blank" alt="changelog">changelog</a>)! You can reload the page to access the new version. <span class="close">Got it!</span>').show().position({my: 'center top', at: 'center top', of: window});
                }
            });
        }

        //Launch every ajax calls. Wait for every one to complete before continuing. Each of those function return a deferred object.
        $.when(fetchSharedInventory(first), fetchBank(first), fetchMaterials(first), fetchCharacters(first), fetchTradingPost(first), fetchWallet(first)).then(function () {
            var currentTime = Date.now();
            if (!first) {
                //Check for new items in the current index
                Object.keys(currentIndex).forEach(function(item) {
                    //If the item is not present in the initial index, that means it is new, so add it to newItems
                    if (initialIndex[item] === undefined) {
                        newItems[item] = currentIndex[item];
                    } else if (initialIndex[item].count < currentIndex[item].count) {
                        //If the item count is now higher, add the difference to newItems
                        newItems[item] = {
                            count: (currentIndex[item].count - initialIndex[item].count)
                        };
                    }
                });

                //Check for removed items
                Object.keys(initialIndex).forEach(function(item) {
                    //If the item is not present in the current index, that means it doesn't belong to the account anymore, so add it to oldItems
                    if (currentIndex[item] === undefined) {
                        oldItems[item] = initialIndex[item];
                    } else if (initialIndex[item].count > currentIndex[item].count) {
                        //If the item count is now lower, add the difference to oldItems
                        oldItems[item] = {
                            count: (initialIndex[item].count - currentIndex[item].count)
                        };
                    }
                });

                //Now that we know what is acquired and what is lost, update the page. Don't refresh the summary and the chart until we're done.
                updating = true;
                updatePage();

                if(localStorage.getItem('playSound') === 'true') {
                    SOUND_EFFECT.play();
                }
            } else {
                currentCurrencies.forEach(function(current, index) {
                    var currency = $('[data-currencyID=' + current.id + ']');
                    var initial = $.grep(initialCurrencies, function(e) {
                        return e.id == current.id;
                    })[0];

                    currency.find('.currentCurrencyValue').html(current.value.format());
                    currency.find('.currencyDifference').html(((current.value - initial.value) > 0 ? '+' : '') + (current.value - initial.value).format());

                    currenciesGraph.highcharts().get('currency-' + current.id).addPoint([currentTime, (current.value - initial.value)], true, false);
                });
            }
        });
    }

    //This function refreshes the content of the page, based on new and old items.
    function updatePage() {
        var deferreds = [];
        var itemIds = [];
        var found;
        var currentTime = Date.now();

        //Update the current gold
        $('#currentGold').html(displayGold(currentGold));

        //Clear grids
        $('#currencies tr').removeClass('currencyPositive currencyNegative');
        $('#gridNew, #gridOld').html('');
        $('#totalNew, #totalOld').hide();
        $('#spinnerNew, #spinnerOld').show();
        gains = 0;
        losses = 0;

        //Other currencies
        currentCurrencies.forEach(function(current, index) {
            var currency = $('[data-currencyID=' + current.id + ']');
            var initial = $.grep(initialCurrencies, function(e) {
                return e.id == current.id;
            })[0];

            currency.find('.currentCurrencyValue').html(current.value.format());
            currency.find('.currencyDifference').html(((current.value - initial.value) > 0 ? '+' : '') + (current.value - initial.value).format());

            if(current.value - initial.value > 0) {
                currency.addClass('currencyPositive', ANIMATION_DURATION);
            } else if (current.value - initial.value < 0) {
                currency.addClass('currencyNegative', ANIMATION_DURATION);
            }

            currenciesGraph.highcharts().get('currency-' + current.id).addPoint([currentTime, (current.value - initial.value)], true, false);
        });

        //Show new items
        if (Object.keys(newItems).length > 0) {
            Object.keys(newItems).forEach(function (itemId, index) {
                itemIds.push(itemId);

                //Every 200 items, call the "items" and "prices" API. Don't forget to do it for the remaining items.
                if (itemIds.length === 200 || index === Object.keys(newItems).length - 1) {
                    (function (list) {
                        //Create a deferred and add it to the array
                        var deferredNew = $.Deferred();
                        deferreds.push(deferredNew);

                        $.getJSON('https://api.guildwars2.com/v2/items?lang=en&ids=' + list.join(',')).done(function (items) {
                            //Compute value of new items
                            $.getJSON('https://api.guildwars2.com/v2/commerce/prices?ids=' + list.join(',')).done(function (prices) {
                                $('#spinnerNew').hide();
                                items.forEach(function (item) {
                                    //Display merchant value of junk items
                                    if (item.rarity === 'Junk') {
                                        createItem('new',
                                                item.id,
                                                item.name,
                                                item.icon,
                                                newItems[item.id].count,
                                                item.vendor_value,
                                                item.vendor_value,
                                                item.rarity,
                                                item.type);
                                    } else {
                                        found = false;
                                        //Find the value of this item
                                        prices.forEach(function (price) {
                                            if (price.id === item.id) {
                                                found = true;
                                                createItem('new',
                                                        item.id,
                                                        item.name,
                                                        item.icon,
                                                        newItems[item.id].count,
                                                        (price.sells && price.sells.quantity > 0 ? price.sells.unit_price : null),
                                                        (price.buys && price.buys.quantity > 0 ? price.buys.unit_price : null),
                                                        item.rarity,
                                                        item.type);
                                            }
                                        });

                                        if (!found) {
                                            createItem('new',
                                                    item.id,
                                                    item.name,
                                                    item.icon,
                                                    newItems[item.id].count,
                                                    null,
                                                    null,
                                                    item.rarity,
                                                    item.type);
                                        }
                                    }
                                });

                                deferredNew.resolve();
                            }).fail(function (jqxhr) {
                                if (jqxhr.status !== 404) {
                                    failedRequest(jqxhr);
                                } else {
                                    $('#spinnerNew').hide();

                                    //Don't worry too much, if you call the API can't find a price on the TP, it returns an error. We still need to add the items.
                                    items.forEach(function (item) {
                                        createItem('new',
                                                item.id,
                                                item.name,
                                                item.icon,
                                                newItems[item.id].count,
                                                null,
                                                null,
                                                item.rarity,
                                                item.type);
                                    });

                                    deferredNew.resolve();
                                }
                            });
                        }).fail(failedRequest);
                    })(itemIds);

                    //Empty the list, start over
                    itemIds = [];
                }
            });
        } else {
            $('#newItems .none').show();
            $('#totalNew').hide();
            $('#spinnerNew').hide();
        }

        //Show old items
        if (Object.keys(oldItems).length > 0) {
            Object.keys(oldItems).forEach(function (itemId, index) {
                itemIds.push(itemId);

                //Every 200 items, call the "items" and "prices" API. Don't forget to do it for the remaining items.
                if (itemIds.length === 200 || index === Object.keys(oldItems).length - 1) {
                    (function (list) {
                        //Create a deferred and add it to the array
                        var deferredOld = $.Deferred();
                        deferreds.push(deferredOld);

                        $.getJSON('https://api.guildwars2.com/v2/items?lang=en&ids=' + list.join(',')).done(function (items) {
                            //Compute value of old items
                            $.getJSON('https://api.guildwars2.com/v2/commerce/prices?ids=' + list.join(',')).done(function (prices) {
                                $('#spinnerOld').hide();

                                items.forEach(function (item) {
                                    //Display merchant value of junk items
                                    if (item.rarity === 'Junk') {
                                        createItem('old',
                                                item.id,
                                                item.name,
                                                item.icon,
                                                oldItems[item.id].count,
                                                item.vendor_value,
                                                item.vendor_value,
                                                item.rarity,
                                                item.type);
                                    } else {
                                        found = false;
                                        //Find the price of this item
                                        prices.forEach(function (price) {
                                            if (price.id === item.id) {
                                                found = true;
                                                createItem('old',
                                                        item.id,
                                                        item.name,
                                                        item.icon,
                                                        oldItems[item.id].count,
                                                        (price.sells && price.sells.quantity > 0 ? price.sells.unit_price : null),
                                                        (price.buys && price.buys.quantity > 0 ? price.buys.unit_price : null),
                                                        item.rarity,
                                                        item.type);
                                            }
                                        });

                                        if (!found) {
                                            createItem('old',
                                                    item.id,
                                                    item.name,
                                                    item.icon,
                                                    oldItems[item.id].count,
                                                    null,
                                                    null,
                                                    item.rarity,
                                                    item.type);
                                        }
                                    }
                                });

                                deferredOld.resolve();
                            }).fail(function (jqxhr) {
                                if (jqxhr.status !== 404) {
                                    failedRequest(jqxhr);
                                } else {
                                    $('#spinnerOld').hide();

                                    //Don't worry too much, if you call the API can't find a price on the TP, it returns an error. We still need to add the items
                                    items.forEach(function (item) {
                                        createItem('old',
                                                item.id,
                                                item.name,
                                                item.icon,
                                                oldItems[item.id].count,
                                                null,
                                                null,
                                                item.rarity,
                                                item.type);
                                    });

                                    deferredOld.resolve();
                                }
                            });
                        });
                    })(itemIds);

                    //Empty the list, start over
                    itemIds = [];
                }
            });
        } else {
            $('#gridOld .none').show();
            $('#totalOld').hide();
            $('#spinnerOld').hide();
        }

        //Show total of value gain / losses when it's ready. Wait for all deferreds to complete before continuing.
        $.when.apply($, deferreds).then(function () {
            var goldGain;

            //Sort the items
            sortItems(localStorage.getItem('sortBy'));

            //Show / hide "None so far" and the total, depending on visible items
            if ($('#gridNew .item:visible').length === 0) {
                $('#newItems .none').show();
                $('#totalNew').hide();
            } else {
                $('#newItems .none').hide();
                $('#totalNew').show();
            }

            if ($('#gridOld .item:visible').length === 0) {
                $('#oldItems .none').show();
                $('#totalOld').hide();
            } else {
                $('#oldItems .none').hide();
                $('#totalOld').show();
            }

            //Update total
            updating = false;
            updateTotal();

            //Acquired gold
            goldGain = (gains - parseInt(gains * 0.15)) - (losses - parseInt(losses * 0.15)) + (currentGold - initialGold);
            goldSeries.addPoint([(new Date()).getTime(), goldGain], true, false);
        });
    }

    //This function compute the gains and the losses, based on the item filters and value type
    function computeGainsAndLosses() {
        //Don't refresh now
        updating = true;
        gains = 0;
        losses = 0;

        //I know it's ugly, but better do the comparison once than in every loops...
        if(localStorage.getItem('ignoreHidden') === 'true') {
            if(localStorage.getItem('valueFrom') === 'lowestSeller') {
                Object.keys(newItems).forEach(function(id) {
                    if(itemTypes.indexOf(newItems[id].type) >= 0) {
                        gains += (newItems[id].count * newItems[id].sellValue);
                    }
                });

                Object.keys(oldItems).forEach(function(id) {
                    if(itemTypes.indexOf(oldItems[id].type) >= 0) {
                        losses += (oldItems[id].count * oldItems[id].sellValue);
                    }
                });
            } else {
                Object.keys(newItems).forEach(function(id) {
                    if(itemTypes.indexOf(newItems[id].type) >= 0) {
                        gains += (newItems[id].count * newItems[id].buyValue);
                    }
                });

                Object.keys(oldItems).forEach(function(id) {
                    if(itemTypes.indexOf(oldItems[id].type) >= 0) {
                        losses += (oldItems[id].count * oldItems[id].buyValue);
                    }
                });
            }
        } else {
            if(localStorage.getItem('valueFrom') === 'lowestSeller') {
                Object.keys(newItems).forEach(function(id) {
                    gains += (newItems[id].count * newItems[id].sellValue);
                });

                Object.keys(oldItems).forEach(function(id) {
                    losses += (oldItems[id].count * oldItems[id].sellValue);
                });
            } else {
                Object.keys(newItems).forEach(function(id) {
                    gains += (newItems[id].count * newItems[id].buyValue);
                });

                Object.keys(oldItems).forEach(function(id) {
                    losses += (oldItems[id].count * oldItems[id].buyValue);
                });
            }
        }

        updating = false;
    }

    //This function fetches the items from the shared inventory slots
    function fetchSharedInventory(first) {
        var def = $.Deferred();

        $.getJSON('https://api.guildwars2.com/v2/account/inventory?access_token=' + token).done(function (json) {
            //Building the index
            json.forEach(function (item) {
                if (item !== null && item.count) {
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex[item.id] === undefined) {
                            initialIndex[item.id] = {
                                count: item.count
                            };
                        } else {
                            //Else we add to the total count
                            initialIndex[item.id].count += item.count;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex[item.id] === undefined) {
                            currentIndex[item.id] = {
                                count: item.count
                            };
                        } else {
                            currentIndex[item.id].count += item.count;
                        }
                    }
                }
            });

            def.resolve();
        }).fail(failedRequest);

        return def;
    }

    //This function fetch the items from the trading post
    function fetchTradingPost(first) {
        var tpDef = $.Deferred();
        var buyDef = $.Deferred();
        var sellDef = $.Deferred();

        //Buy listings
        $.getJSON('https://api.guildwars2.com/v2/commerce/transactions/current/buys?access_token=' + token).done(function (json) {
            //Building the index
            json.forEach(function (item) {
                if (item !== null && item.quantity) {
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex[item.item_id] === undefined) {
                            initialIndex[item.item_id] = {
                                count: item.quantity
                            };
                        } else {
                            //Else we add to the total count
                            initialIndex[item.item_id].count += item.quantity;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex[item.item_id] === undefined) {
                            currentIndex[item.item_id] = {
                                count: item.quantity
                            };
                        } else {
                            currentIndex[item.item_id].count += item.quantity;
                        }
                    }
                }
            });

            buyDef.resolve();
        }).fail(failedRequest);

        //Sell listings
        $.getJSON('https://api.guildwars2.com/v2/commerce/transactions/current/sells?access_token=' + token).done(function (json) {
            //Building the index
            json.forEach(function (item) {
                if (item !== null && item.quantity) {
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex[item.item_id] === undefined) {
                            initialIndex[item.item_id] = {
                                count: item.quantity
                            };
                        } else {
                            //Else we add to the total count
                            initialIndex[item.item_id].count += item.quantity;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex[item.item_id] === undefined) {
                            currentIndex[item.item_id] = {
                                count: item.quantity
                            };
                        } else {
                            currentIndex[item.item_id].count += item.quantity;
                        }
                    }
                }
            });

            sellDef.resolve();
        }).fail(failedRequest);

        $.when(buyDef, sellDef).then(function () {
            tpDef.resolve();
        });

        return tpDef;
    }

    //This function fetch the items from the bank
    function fetchBank(first) {
        var def = $.Deferred();

        $.getJSON('https://api.guildwars2.com/v2/account/bank?access_token=' + token).done(function (json) {
            //Building the index
            json.forEach(function (item) {
                if (item !== null && item.count) {
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex[item.id] === undefined) {
                            initialIndex[item.id] = {
                                count: item.count
                            };
                        } else {
                            //Else we add to the total count
                            initialIndex[item.id].count += item.count;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex[item.id] === undefined) {
                            currentIndex[item.id] = {
                                count: item.count
                            };
                        } else {
                            currentIndex[item.id].count += item.count;
                        }
                    }
                }
            });

            def.resolve();
        }).fail(failedRequest);

        return def;
    }

    //This function fetch the items from the materials storage
    function fetchMaterials(first) {
        var def = $.Deferred();

        $.getJSON('https://api.guildwars2.com/v2/account/materials?access_token=' + token).done(function (json) {
            //Building the index
            json.forEach(function (item) {
                if (item !== null && item.count) {
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex[item.id] === undefined) {
                            initialIndex[item.id] = {
                                count: item.count
                            };
                        } else {
                            //Else we add to the total count
                            initialIndex[item.id].count += item.count;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex[item.id] === undefined) {
                            currentIndex[item.id] = {
                                count: item.count
                            };
                        } else {
                            currentIndex[item.id].count += item.count;
                        }
                    }
                }
            });

            def.resolve();
        }).fail(failedRequest);

        return def;
    }

    //This function fetch the items from the characters' inventory
    function fetchCharacters(first) {
        var def = $.Deferred();

        $.getJSON('https://api.guildwars2.com/v2/characters?page=0&access_token=' + token).done(function (json) {
            //Building the index
            json.forEach(function (character) {
                //Currently equipped items
                character.equipment.forEach(function (item) {
                    if(item !== null) {
                        if (first) {
                            //If not already in the index we add it
                            if (initialIndex[item.id] === undefined) {
                                initialIndex[item.id] = {
                                    count: 1
                                };
                            } else {
                                //Else we add to the total count
                                initialIndex[item.id].count += 1;
                            }
                        } else {
                            //Build an index for current items
                            if (currentIndex[item.id] === undefined) {
                                currentIndex[item.id] = {
                                    count: 1
                                };
                            } else {
                                currentIndex[item.id].count += 1;
                            }
                        }
                    }
                });

                //Look also in the inventory (scan each bags)
                character.bags.forEach(function (bag) {
                    if (bag !== null) {
                        //Loop on each slots
                        bag.inventory.forEach(function (item) {
                            if (item !== null && item.count) {
                                if (first) {
                                    //If not already in the index we add it
                                    if (initialIndex[item.id] === undefined) {
                                        initialIndex[item.id] = {
                                            count: item.count
                                        };
                                    } else {
                                        //Else we add to the total count
                                        initialIndex[item.id].count += item.count;
                                    }
                                } else {
                                    //Build an index for current items
                                    if (currentIndex[item.id] === undefined) {
                                        currentIndex[item.id] = {
                                            count: item.count
                                        };
                                    } else {
                                        currentIndex[item.id].count += item.count;
                                    }
                                }
                            }
                        });
                    }
                });
            });

            def.resolve();
        }).fail(failedRequest);

        return def;
    }

    //This function fetches the wallet
    function fetchWallet(first) {
        var def = $.Deferred();

        $.getJSON('https://api.guildwars2.com/v2/account/wallet?access_token=' + token).done(function (wallet) {
            if (first) {
                initialGold = wallet[0].value;
                currentGold = wallet[0].value;
                wallet.shift();

                initialCurrencies = $.map([2,3,4,5,6,7,9,10,11,12,13,14,15,16,18,19,20,22,23,24,25,26,27,28,29,30,31,32], function(e) {
                    var c = {
                        id: e,
                        value: 0
                    };

                    wallet.forEach(function(currency) {
                        if(currency.id === e) {
                            c.value = currency.value;
                            $('[data-currencyID=' + currency.id + '] .initialCurrencyValue').html(currency.value.format());
                        }
                    });

                    return c;
                });

                currentCurrencies = initialCurrencies;
            } else {
                currentGold = wallet[0].value;
                wallet.shift();

                currentCurrencies = $.map([2,3,4,5,6,7,9,10,11,12,13,14,15,16,18,19,20,22,23,24,25,26,27,28,29,30,31,32], function(e) {
                    var c = {
                        id: e,
                        value: 0
                    };

                    wallet.forEach(function(currency) {
                        if(currency.id === e) {
                            c.value = currency.value;
                        }
                    });

                    return c;
                });

                $('#currentTime').html(new Date().toLocaleString());
            }
            def.resolve();
        }).fail(failedRequest);

        return def;
    }

    //This function creates an item and adds it to the specified container. Filters will also be applied based on what the user chose in the settings.
    function createItem(container, id, name, icon, count, sellValue, buyValue, rarity, type) {
        if(count !== null) {
            var itemValue = (localStorage.getItem('valueFrom') === 'lowestSeller' ? sellValue : buyValue);
            var totalSell = (sellValue !== null ? sellValue * count : 0);
            var totalBuy = (buyValue !== null ? buyValue * count : 0);
            var rarityLevel;

            switch (rarity) {
            case 'Junk':
                rarityLevel = 1;
                break;
            case 'Basic':
                rarityLevel = 2;
                break;
            case 'Fine':
                rarityLevel = 3;
                break;
            case 'Masterwork':
                rarityLevel = 4;
                break;
            case 'Rare':
                rarityLevel = 5;
                break;
            case 'Exotic':
                rarityLevel = 6;
                break;
            case 'Ascended':
                rarityLevel = 7;
                break;
            case 'Legendary':
                rarityLevel = 8;
                break;
            }

            var item = $('<div class="item ' + rarity + ' ' + type + '" style="display:none;"' +
                    'data-id="' + id + '" data-type="' + type + '"' +
                    'data-rarity="' + rarityLevel + '" data-name="' + name + '" ' +
                    'data-sellvalue="' + totalSell + '" ' + 
                    'data-buyvalue="' + totalBuy + '" ' + '>' +
                    '<table><tr><td class="icon"></td><td><div class="description"' + ($('#toggleDetails').prop('checked') ? '' : 'style="display:none;"') + '></div></td></tr></table>' +
                    '</div>');

            item.find('.icon').css('background-image', 'url(' + icon + ')')
                .append('<span class="count">' + count + '</span>');

            item.find('.description').html('<div class="itemName"><a title="View item on the wiki (opens in a new tab)" href="https://wiki.guildwars2.com/index.php?search=' + encodeURIComponent(name) + '" target="_blank">' + name + '</a></div>');


            if(sellValue !== null) {
                item.find('.description').append('<div class="itemSellValue" ' + (localStorage.getItem('valueFrom') === 'lowestSeller' ? '' : 'style="display: none;"') + '>Unit value : ' + displayGold(sellValue) +
                        '<br>Total value : ' + displayGold(totalSell) + '</div>');
            }

            if(buyValue !== null) {
                 item.find('.description').append('<div class="itemBuyValue" ' + (localStorage.getItem('valueFrom') === 'lowestSeller' ? 'style="display: none;"' : '') + '>Unit value : ' + displayGold(buyValue) +
                        '<br>Total value : ' + displayGold(totalBuy) + '</div>');
            }

            if(container === 'new') {
                $('#gridNew').append(item);
                newItems[id].type = type;
                newItems[id].rarity = rarity;
                newItems[id].sellValue = sellValue;
                newItems[id].buyValue = buyValue;
            } else {
                $('#gridOld').append(item);
                oldItems[id].type = type;
                oldItems[id].rarity = rarity;
                oldItems[id].sellValue = sellValue;
                oldItems[id].buyValue = buyValue;
            }

            //Show the item only if the item type is allowed by the user
            if(itemTypes.indexOf(type) >= 0) {
                item.fadeIn(ANIMATION_DURATION);
            }

            if(itemTypes.indexOf(type) >= 0 || localStorage.getItem('ignoreHidden') === 'false') {
                if(container === 'new') {
                    gains += (count * itemValue);
                } else {
                    losses += (count * itemValue);
                }
            }
        }
    }

    //Utility function to sort the items.
    function sortItems(sortBy) {
        var gridNew = $('#gridNew'),
            gridOld = $('#gridOld'),
            itemsNew = $('#gridNew .item'),
            itemsOld = $('#gridOld .item');

        if(sortBy === 'rarity') {
            itemsNew.sort(function(a, b){
                var r1 = parseInt($(a).data('rarity'), 10),
                    r2 = parseInt($(b).data('rarity'), 10),
                    n1 = $(a).data('name'),
                    n2 = $(b).data('name');

                if(r1 > r2) {
                    return 1;
                } else if(r2 > r1) {
                    return -1;
                } else {
                    return n1.localeCompare(n2);
                }
            });

            itemsNew.detach().appendTo(gridNew);

            itemsOld.sort(function(a, b){
                var r1 = parseInt($(a).data('rarity'), 10),
                    r2 = parseInt($(b).data('rarity'), 10),
                    n1 = $(a).data('name'),
                    n2 = $(b).data('name');

                if(r1 > r2) {
                    return 1;
                } else if(r2 > r1) {
                    return -1;
                } else {
                    return n1.localeCompare(n2);
                }
            });

            itemsOld.detach().appendTo(gridOld);
        } else {
            itemsNew.sort(function(a, b){
                var r1, r2;
                if(localStorage.getItem('valueFrom') === 'lowestSeller') {
                    r1 = parseInt($(a).data('sellvalue'), 10);
                    r2 = parseInt($(b).data('sellvalue'), 10);
                } else {
                    r1 = parseInt($(a).data('buyvalue'), 10);
                    r2 = parseInt($(b).data('buyvalue'), 10);
                }

                var n1 = $(a).data('name'),
                    n2 = $(b).data('name');

                if(r1 > r2) {
                    return -1;
                } else if(r2 > r1) {
                    return 1;
                } else {
                    return n1.localeCompare(n2);
                }
            });

            itemsNew.detach().appendTo(gridNew);

            itemsOld.sort(function(a, b){
                var r1, r2;
                if(localStorage.getItem('valueFrom') === 'lowestSeller') {
                    r1 = parseInt($(a).data('sellvalue'), 10);
                    r2 = parseInt($(b).data('sellvalue'), 10);
                } else {
                    r1 = parseInt($(a).data('buyvalue'), 10);
                    r2 = parseInt($(b).data('buyvalue'), 10);
                }
                var n1 = $(a).data('name'),
                    n2 = $(b).data('name');

                if(r1 > r2) {
                    return -1;
                } else if(r2 > r1) {
                    return 1;
                } else {
                    return n1.localeCompare(n2);
                }
            });

            itemsOld.detach().appendTo(gridOld);
        }
    }

    //Utility function to build the html for displaying gold based on a number of coppers
    function displayGold(coppers, showCoppers) {
        var c, s, g;
        var negative = false;

        if(isNaN(coppers)) {
            return 'Value error';
        } else {
            if (coppers < 0) {
                negative = true;
            }

            coppers = Math.abs(coppers);

            c = coppers % 100;
            s = (coppers / 100) % 100;
            g = coppers / 10000;

            return ((negative ? '- ' : '') +
                    parseInt(g, 10) + ' <i class="goldIcon"></i> ' +
                    parseInt(s, 10).toString().paddingLeft('00') + ' <i class="silverIcon"></i> ' +
                    (showCoppers == false ? '' :
                    parseInt(c, 10).toString().paddingLeft('00') + ' <i class="copperIcon"></i>'));
        }
    }

//Events binding
    //Toggling "Save my API key"
    $('#saveAPIKey').on('change', function() {
        localStorage.setItem('saveAPIKey', $(this).prop('checked'));
    });

    //Clicking the "Continue" button on the first screen
    $('#continueIntro').on('click', function () {
        if ($('#apiKey').val().length === 0) {
            alert('Please enter your API key!');
        } else {
            token = $('#apiKey').val();
            //Save the API key for future use
            localStorage.setItem('APIKey', token);

            $('#intro').hide();
            $('#main, #menu').show();

            init();
        }
    });

    //Clicking the "About" link
    $('#about').on('click', function () {
        if($('#aboutPopup').is(':visible')) {
            $('#aboutPopup').hide(ANIMATION_DURATION);
            $('#popupOverlay').hide();
        } else {
            $('#aboutPopup').show().position({my: 'center center', at: 'center center', of: window, collision: 'flipfit'}).hide().toggle(ANIMATION_DURATION);
            $('#popupOverlay').show();
        }
    });

    //Clicking the "Settings" link
    $('#settings').on('click', function () {
        if($('#settingsPopup').is(':visible')) {
            $('#settingsPopup').hide(ANIMATION_DURATION);
            $('#popupOverlay').hide();
        } else {
            $('#settingsPopup').show().position({my: 'center center', at: 'center center', of: window, collision: 'flipfit'}).hide().toggle(ANIMATION_DURATION);
            $('#popupOverlay').show();
        }
    });

    //When clicking anywhere but in the settings, close the settings popup
    $('html').on('click', function (event) {
        var target = $(event.target);
        if (!target.closest('#settingsPopup, #settings').length) {
            $('#settingsPopup').hide(ANIMATION_DURATION);
            
            if (!target.closest('#aboutPopup, #about').length) {
                $('#popupOverlay').hide();
            }
        }

        if (!target.closest('#aboutPopup, #about').length) {
            $('#aboutPopup').hide(ANIMATION_DURATION);

            if (!target.closest('#settingsPopup, #settings').length) {
                $('#popupOverlay').hide();
            }
        }
    });

    //Clicking the "Stop" button
    $('#stop').on('click', function () {
        //Hide this button and the countdown, show the start over and resume buttons
        $(this).hide();
        $('#countdown').html('');
        $('#startOver, #resume').show();

        //Stop refreshing every second
        keepGoing = false;

        //Empty the chart's data
        //goldPerHourSeries.data = [];
    });

    //Clicking the "Start over" button
    $('#startOver').on('click', function () {
        init();
    });

    //Clicking the "Resume" button
    $('#resume').on('click', function () {
        $(this).hide();
        $('#startOver').hide();
        $('#stop').show();
        initiatedOn = Date.now();
        timeElapsed = 0;
        intervalCount = 0;
        keepGoing = true;
        tick();
    });



    //When toggling item details, show/hide item description
    $('#toggleDetails').on('change', function () {
        $('.description').toggle(ANIMATION_DURATION);
        localStorage.setItem('showDetails', $(this).prop('checked'));
    });

    //Changing the "Play a sound" option
    $('#toggleSound').on('change', function () {
        localStorage.setItem('playSound', $(this).prop('checked'));
    });

    //Changing the "Sort by" option, sort the currently displayed items and save the setting
    $('[name=sortBy]').on('change', function () {
        sortItems($(this).val());
        localStorage.setItem('sortBy', $(this).val());
    });

    //Toggling "value from"
    $('[name=valueFrom]').on('change', function () {
        localStorage.setItem('valueFrom', $(this).val());
        $('.itemSellValue, .itemBuyValue').toggle();
        computeGainsAndLosses();
        sortItems(localStorage.getItem('sortBy'));
    });

    //Toggling "base time on"
    $('[name=baseTime]').on('change', function () {
        localStorage.setItem('baseTime', $(this).val());
    });

    //Checking all item types
    $('#checkAllTypes').on('change', function () {
        //Check or uncheck all item types
        if ($(this).prop('checked')) {
            $('.itemType:not(:checked)').prop('checked', true);

            $('.item').show(ANIMATION_DURATION, function() {
                if ($('#gridNew .item:visible').length === 0) {
                    $('#newItems .none').show();
                    $('#totalNew').hide();
                } else {
                    $('#newItems .none').hide();
                    $('#totalNew').show();
                }

                if ($('#gridOld .item:visible').length === 0) {
                    $('#oldItems .none').show();
                    $('#totalOld').hide();
                } else {
                    $('#oldItems .none').hide();
                    $('#totalOld').show();
                }
            });
        } else {
            $('.itemType:checked').prop('checked', false);

            $('.item').hide(ANIMATION_DURATION, function() {
                $('#newItems .none').show();
                $('#totalNew').hide();

                $('#oldItems .none').show();
                $('#totalOld').hide();
            });
        }

        //Save settings to localStorage
        localStorage.setItem('itemTypes', $.map($('.itemType:checked'), function (n) {
            return '#' + $(n).attr('id');
        }).join(', '));

        //Save the item types in an array for faster filtering when adding items in the page
        itemTypes = [];
        $('.itemType:checked').each(function() {
            itemTypes.push($(this).data('type'));
        });

        //Compute the new gains / losses
        computeGainsAndLosses();
    });

    //Toggling individual item types
    $('.itemType').on('change', function () {
        //Check or uncheck "checkAll"
        if (!$(this).prop('checked')) {
            $('#checkAllTypes').prop('checked', false);
        } else if ($('.itemType').length === $('.itemType:checked').length) {
            $('#checkAllTypes').prop('checked', true);
        }

        //Save settings to localStorage
        localStorage.setItem('itemTypes', $.map($('.itemType:checked'), function (n) {
            return '#' + $(n).attr('id');
        }).join(', '));

        //Save the item types in an array for faster filtering when adding items in the page
        itemTypes = [];
        $('.itemType:checked').each(function() {
            itemTypes.push($(this).data('type'));
        });

        //Animate toggle, then show or hide totals
        $('.' + $(this).data('type')).toggle(ANIMATION_DURATION, function() {
            if ($('#gridNew .item:visible').length === 0) {
                $('#newItems .none').show();
                $('#totalNew').hide();
            } else {
                $('#newItems .none').hide();
                $('#totalNew').show();
            }

            if ($('#gridOld .item:visible').length === 0) {
                $('#oldItems .none').show();
                $('#totalOld').hide();
            } else {
                $('#oldItems .none').hide();
                $('#totalOld').show();
            }
        });

        //Compute the new gains / losses
        computeGainsAndLosses();
    });

    //Ignore discarded item types
    $('#ignoreHidden').on('change', function() {
        localStorage.setItem('ignoreHidden', $(this).prop('checked'));
        computeGainsAndLosses();
    });

    //Restoring defaults settings
    $('#restoreDefaults').on('click', function() {
        localStorage.setItem('saveAPIKey', true);
        localStorage.setItem('showDetails', true);
        localStorage.setItem('playSound', false);
        localStorage.setItem('sortBy', 'rarity');
        localStorage.setItem('valueFrom', 'lowestSeller');
        localStorage.setItem('baseTime', 'sinceStart');
        localStorage.setItem('itemTypes', $.map($('.itemType'), function (n) {
            return '#' + $(n).attr('id');
        }).join(', '));
        itemTypes = [];
        $('.itemType').each(function() {
            itemTypes.push($(this).data('type'));
        });
        localStorage.setItem('ignoreHidden', false);

        $('#saveAPIKey').prop('checked', true);
        $('#toggleDetails').prop('checked', true);
        $('#toggleSound').prop('checked',false);
        $('#sortByRarity').prop('checked', true);
        $('#lowestSeller').prop('checked', true);
        $('#sinceStart').prop('checked', true);
        $('.itemType').prop('checked', true);
        $('#checkAllTypes').prop('checked', true);
        $('#ignoreHidden').prop('checked', false);

        //Reset everything
        $('.description').show(ANIMATION_DURATION);
        $('.itemSellValue').show();
        $('.itemBuyValue').hide();

        $('.item').show(ANIMATION_DURATION, function() {
            if ($('#gridNew .item:visible').length === 0) {
                $('#newItems .none').show();
                $('#totalNew').hide();
            } else {
                $('#newItems .none').hide();
                $('#totalNew').show();
            }

            if ($('#gridOld .item:visible').length === 0) {
                $('#oldItems .none').show();
                $('#totalOld').hide();
            } else {
                $('#oldItems .none').hide();
                $('#totalOld').show();
            }

            computeGainsAndLosses();
            sortItems('rarity');
        });
    });

    //Toggling the summary
    $('#toggleSummary').on('click', function() {
        $('#header').toggle(ANIMATION_DURATION);
    });

    //Toggling the other currencies
    $('#toggleCurrencies').on('click', function() {
        $('#currencies').toggle(ANIMATION_DURATION);
    });

    //Toggling acquired items
    $('#toggleNew').on('click', function() {
        $('#newItems').toggle(ANIMATION_DURATION);
    });

    //Toggling lost items
    $('#toggleOld').on('click', function() {
        $('#oldItems').toggle(ANIMATION_DURATION);
    });

    //Toggling all currencies
    $('#currencies').on('change', '#checkAllCurrencies', function() {
        if($(this).prop('checked')) {
            currenciesGraph.highcharts().series.forEach(function(series) {
                series.setVisible(true, false);
            });
        } else {
            currenciesGraph.highcharts().series.forEach(function(series) {
                series.setVisible(false, false);
            });
        }
        currenciesGraph.highcharts().redraw();

        $('.currencySelect').prop('checked', $(this).prop('checked'));

        //Save the selected currencies
        localStorage.setItem('currencies', $.map($('.currencySelect:checked'), function (n) {
            return '#' + $(n).attr('id');
        }).join(', '));
    });

    //Toggling currencies for the graph
    $('#currencies').on('change', '.currencySelect', function() {
        if($(this).prop('checked')) {
            currenciesGraph.highcharts().get('currency-' + $(this).val()).show();
        } else {
            currenciesGraph.highcharts().get('currency-' + $(this).val()).hide();
        }

        if (!$(this).prop('checked')) {
            $('#checkAllCurrencies').prop('checked', false);
        } else if ($('.currencySelect').length === $('.currencySelect:checked').length) {
            $('#checkAllCurrencies').prop('checked', true);
        }

        //Save the selected currencies
        localStorage.setItem('currencies', $.map($('.currencySelect:checked'), function (n) {
            return '#' + $(n).attr('id');
        }).join(', '));
    });

    //Clear api key
    $('.clearAPIKey').on('click', function() {
        if(confirm('Are you sure you want to clear your saved API key?')) {
            $('#apiKey').val('');
            localStorage.setItem('APIKey', '');
            alert('Your saved API key has been cleared!');
        }
    });

    //Close warnings
    $('#warning').on('click', '.close', function() {
        $('#warning').hide(ANIMATION_DURATION);
    });

    //Close new version
    $('#newVersion').on('click', '.close', function() {
        $('#newVersion').hide(ANIMATION_DURATION);
        
        if(!$(this).is('.first')) {
            checkVersion = false;
        }
    })

    //Debug button
    $('#saveCurrentState').on('click', function() {
        var currentState = {
            "startedOn": startedOn,
            "keepGoing": keepGoing,
            "intervalCount": intervalCount,
            "REFRESH_RATE": REFRESH_RATE,
            "timeElapsed": timeElapsed,
            "token": token,
            "initialGold" : initialGold,
            "currentGold" : currentGold,
            /*"initialIndex" : initialIndex,
            "currentIndex" : currentIndex,*/
            "newItems" : newItems,
            "oldItems" : oldItems,
            "refreshID" : refreshID,
            "gains" : gains,
            "losses" : losses,
            "itemTypes" : itemTypes,
            "updating" : updating,

            "localStorage" : localStorage
        };
        console.save(currentState);
    });
}());
