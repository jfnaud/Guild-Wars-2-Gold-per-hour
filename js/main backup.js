//Created by : Deviljeff.1946
//August 2015

    //List of item types to display
    var itemTypes = [];
    //Grids for isotope
    var gridNew;
    var gridOld;
    
(function () {
    //Application started on
    var startedOn;
    //Refresh rate (in seconds)
    var refreshRate = 180;
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
    
    
    
    //Gold per hour plot
    var plot;
    var gphSeries = [];
    var maxPoints = 3600;
    
    
    
    //Utility function for padding zeroes when displaying gold
    String.prototype.paddingLeft = function (paddingValue) {
        return String(paddingValue + this).slice(-paddingValue.length);
    };
    
    //Handles failed request
    function failedRequest(jqxhr) {
        if (jqxhr.status === 400) {
            $('body').html('<b>Error!</b> GW2 API is not working, try later :(');
        } else {
            $('body').html('<b>Error!</b> Invalid API Key!');
        }
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
                if (item !== null) {
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex['' + item.item_id] === undefined) {
                            initialIndex['' + item.item_id] = item.quantity;
                        } else {
                            //Else we add to the total count
                            initialIndex['' + item.item_id] = initialIndex['' + item.item_id] + item.quantity;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex['' + item.item_id] === undefined) {
                            currentIndex['' + item.item_id] = item.quantity;
                        } else {
                            currentIndex['' + item.item_id] = currentIndex['' + item.item_id] + item.quantity;
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
                if (item !== null) {
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex['' + item.item_id] === undefined) {
                            initialIndex['' + item.item_id] = item.quantity;
                        } else {
                            //Else we add to the total count
                            initialIndex['' + item.item_id] = initialIndex['' + item.item_id] + item.quantity;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex['' + item.item_id] === undefined) {
                            currentIndex['' + item.item_id] = item.quantity;
                        } else {
                            currentIndex['' + item.item_id] = currentIndex['' + item.item_id] + item.quantity;
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
                if (item !== null) {
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex['' + item.id] === undefined) {
                            initialIndex['' + item.id] = item.count;
                        } else {
                            //Else we add to the total count
                            initialIndex['' + item.id] = initialIndex['' + item.id] + item.count;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex['' + item.id] === undefined) {
                            currentIndex['' + item.id] = item.count;
                        } else {
                            currentIndex['' + item.id] = currentIndex['' + item.id] + item.count;
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
                if (item !== null) {
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex['' + item.id] === undefined) {
                            initialIndex['' + item.id] = item.count;
                        } else {
                            //Else we add to the total count
                            initialIndex['' + item.id] = initialIndex['' + item.id] + item.count;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex['' + item.id] === undefined) {
                            currentIndex['' + item.id] = item.count;
                        } else {
                            currentIndex['' + item.id] = currentIndex['' + item.id] + item.count;
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
                    if (first) {
                        //If not already in the index we add it
                        if (initialIndex['' + item.id] === undefined) {
                            initialIndex['' + item.id] = 1;
                        } else {
                            //Else we add to the total count
                            initialIndex['' + item.id] = initialIndex['' + item.id] + 1;
                        }
                    } else {
                        //Build an index for current items
                        if (currentIndex['' + item.id] === undefined) {
                            currentIndex['' + item.id] = 1;
                        } else {
                            currentIndex['' + item.id] = currentIndex['' + item.id] + 1;
                        }
                    }
                });
                
                //Look also in the inventory (scan each bags)
                character.bags.forEach(function (bag) {
                    if (bag !== null) {
                        //Loop on each slots
                        bag.inventory.forEach(function (item) {
                            if (item !== null) {
                                if (first) {
                                    //If not already in the index we add it
                                    if (initialIndex['' + item.id] === undefined) {
                                        initialIndex['' + item.id] = item.count;
                                    } else {
                                        //Else we add to the total count
                                        initialIndex['' + item.id] = initialIndex['' + item.id] + item.count;
                                    }
                                } else {
                                    //Build an index for current items
                                    if (currentIndex['' + item.id] === undefined) {
                                        currentIndex['' + item.id] = item.count;
                                    } else {
                                        currentIndex['' + item.id] = currentIndex['' + item.id] + item.count;
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
            } else {
                currentGold = wallet[0].value;
                
                $('#currentTime').html(new Date().toLocaleString());
            }
            def.resolve();
        }).fail(failedRequest);
        
        return def;
    }
    
    //This function fetches the items currently associated with the account. The "first" parameter is used to build the initialIndex when the application is started
    function fetchItems(first) {
        newItems = {};
        oldItems = {};
        currentIndex = {};
        
        $.when(fetchBank(first), fetchMaterials(first), fetchCharacters(first), fetchTradingPost(first), fetchWallet(first)).then(function () {            
            if (!first) {
                //Check for new items in the current index
                Object.keys(currentIndex).forEach(function (key) {
                    //If the item is not present in the initial index, that means it is new, so add it to newItems
                    if (initialIndex['' + key] === undefined) {
                        newItems['' + key] = currentIndex[key];
                    } else if (initialIndex['' + key] < currentIndex[key]) {
                        //If the item count is now higher, add the difference to newItems
                        newItems['' + key] = currentIndex[key] - initialIndex['' + key];
                    }
                });
                
                //Check for removed items
                Object.keys(initialIndex).forEach(function (key) {
                    //If the item is not present in the current index, that means it doesn't belong to the account anymore, so add it to oldItems
                    if (currentIndex[key] === undefined) {
                        oldItems['' + key] = initialIndex['' + key];
                    } else if (initialIndex['' + key] > currentIndex[key]) {
                        //If the item count is now lower, add the difference to oldItems
                        oldItems['' + key] = initialIndex['' + key] - currentIndex[key];
                    }
                });
                
                updatePage();
            }
        });
    }
    
    //This function returns the DOM for an item to be displayed on the page
    function createItem(id, name, icon, count, itemValue, rarity, type) {
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
        var item = $('<div class="item ' + rarity + ' ' + type + '" ' +
                'data-id="' + id + '" data-type="' + type + '"' +
                'data-rarity="' + rarityLevel + '" data-name="' + name + '" ' +
                'data-value="' + (itemValue * count) + '" ' + '>' +
                '<table><tr><td class="icon"></td><td class="description"' + ($('#toggleDetails').prop('checked') ? '' : 'style="display:none;"') + '></td></tr></table>' +
                '</div>');
        
        item.find('.icon').css('background-image', 'url(' + icon + ')')
            .append('<span class="count">' + count + '</span>');
        
        item.find('.description').html(name + '<br>');
        
        if (itemValue !== null) {
            item.find('.description').append('<div class="itemValue">Unit value : ' + displayGold(itemValue) +
                    '<br>Total value : ' + displayGold(itemValue * count) + '</div>');
        }
        
        return item;
    }
    
    //This function refreshes the content of the page, based on new and old items
    function updatePage() {
        var deferreds = [];
        var itemIds = [];
        var found;
        
        //Update the current gold
        $('#currentGold').html(displayGold(currentGold));
        
        //Clear grids
        gridNew.isotope('remove', $('#gridNew .item')).isotope();
        gridOld.isotope('remove', $('#gridOld .item')).isotope();
        
        //Show new items
        if (Object.keys(newItems).length > 0) {
            Object.keys(newItems).forEach(function (itemId, index) {
                itemIds.push(itemId);
                
                //Every 200 items, call the API, and also at the end
                if (itemIds.length === 200 || index === Object.keys(newItems).length - 1) {
                    var deferredNew = $.Deferred();
                    deferreds.push(deferredNew);
                    
                    (function (list, def) {
                        $.getJSON('https://api.guildwars2.com/v2/items?lang=en&ids=' + list.join(',')).done(function (items) {
                            //Compute value of new items
                            $.getJSON('https://api.guildwars2.com/v2/commerce/prices?ids=' + list.join(',')).done(function (prices) {
                                items.forEach(function (item) {
                                    //Display merchant value of junk items
                                    if (item.rarity === 'Junk') {
                                        gridNew.isotope('insert', createItem(item.id,
                                                item.name,
                                                item.icon,
                                                newItems[item.id],
                                                item.vendor_value,
                                                item.rarity,
                                                item.type));
                                        
                                        //And remove it from the ids to avoid API error (invalid id)
                                        delete newItems[item.id];
                                    } else {
                                        found = false;
                                        //Find the price of this item
                                        prices.forEach(function (price) {
                                            if (price.id === item.id && price.sells) {
                                                found = true;
                                                gridNew.isotope('insert', createItem(item.id,
                                                        item.name,
                                                        item.icon,
                                                        newItems[item.id],
                                                        price.sells.unit_price,
                                                        item.rarity,
                                                        item.type));
                                            }
                                        });
                                        
                                        if (!found) {
                                            gridNew.isotope('insert', createItem(item.id,
                                                    item.name,
                                                    item.icon,
                                                    newItems[item.id],
                                                    null,
                                                    item.rarity,
                                                    item.type));
                                        }
                                    }
                                });
                                
                                def.resolve();
                            }).fail(function (jqxhr) {
                                if (jqxhr.status === 400) {
                                    $('body').html('<b>Error!</b> GW2 API is not working, try later :(');
                                } else {
                                    //Don't worry too much, if you call the API can't find a price on the TP, it returns an error. We still need to add the items.
                                    items.forEach(function (item) {
                                        gridNew.isotope('insert', createItem(item.id,
                                                item.name,
                                                item.icon,
                                                newItems[item.id],
                                                null,
                                                item.rarity,
                                                item.type));
                                    });
                                    
                                    def.resolve();
                                }
                            });
                        });
                    })(itemIds, deferredNew);
                    
                    //Empty the list, start over
                    itemIds = [];
                }
            });
        } else {
            $('#newItems .none').show();
            $('#totalNew').hide();
        }
        
        //Show old items
        if (Object.keys(oldItems).length > 0) {
            Object.keys(oldItems).forEach(function (itemId, index) {
                itemIds.push(itemId);
                
                //Every 200 items, call the API, and also at the end
                if (itemIds.length === 200 || index === Object.keys(oldItems).length - 1) {
                    var deferredOld = $.Deferred();
                    deferreds.push(deferredOld);
                    
                    (function (list, def) {
                        $.getJSON('https://api.guildwars2.com/v2/items?lang=en&ids=' + list.join(',')).done(function (items) {
                            //Compute value of old items
                            $.getJSON('https://api.guildwars2.com/v2/commerce/prices?ids=' + list.join(',')).done(function (prices) {
                                items.forEach(function (item) {
                                    //Display merchant value of junk items
                                    if (item.rarity === 'Junk') {
                                        gridOld.isotope('insert', createItem(item.id,
                                                item.name,
                                                item.icon,
                                                oldItems[item.id],
                                                item.vendor_value,
                                                item.rarity,
                                                item.type));
                                        
                                        //And remove it from the ids to avoid API error (invalid id)
                                        delete oldItems[item.id];
                                    } else {
                                        found = false;
                                        //Find the price of this item
                                        prices.forEach(function (price) {
                                            if (price.id === item.id && price.sells) {
                                                found = true;
                                                gridOld.isotope('insert', createItem(item.id,
                                                        item.name,
                                                        item.icon,
                                                        oldItems[item.id],
                                                        price.sells.unit_price,
                                                        item.rarity,
                                                        item.type));
                                            }
                                        });
                                        
                                        if (!found) {
                                            gridOld.isotope('insert', createItem(item.id,
                                                    item.name,
                                                    item.icon,
                                                    oldItems[item.id],
                                                    null,
                                                    item.rarity,
                                                    item.type));
                                        }
                                        
                                    }
                                });
                                
                                def.resolve();
                            }).fail(function (jqxhr) {
                                if (jqxhr.status === 400) {
                                    $('body').html('<b>Error!</b> GW2 API is not working, try later :(');
                                } else {
                                    //Don't worry too much, if you call the API can't find a price on the TP, it returns an error. We still need to add the items
                                    items.forEach(function (item) {
                                        gridOld.isotope('insert', createItem(item.id,
                                                item.name,
                                                item.icon,
                                                oldItems[item.id],
                                                null,
                                                item.rarity,
                                                item.type));
                                    });
                                    
                                    def.resolve();
                                }
                            });
                        });
                    })(itemIds, deferredOld);
                    
                    //Empty the list, start over
                    itemIds = [];
                }
            });
        } else {
            $('#gridOld .none').show();
            $('#totalOld').hide();
        }
        
        //Show total of value gain / losses when it's ready
        $.when.apply($, deferreds).then(function () {
            updateTotal();
        });
    }
    
    //Updates the "Total" section
    function updateTotal() {
        var timeDiff = 3600000 / (Date.now() - startedOn);
        var goldDiff = currentGold - initialGold;
        var goldPerHour;
        
        //Compute gains
        gains = 0;
        losses = 0;
        
        $('#gridNew .item:visible').each(function () {
            if ($(this).data('value') !== '') {
                gains += parseInt($(this).data('value'));
            }
        });
        
        $('#totalNew').html('Gains (listing, before fees): <span class="price">' + displayGold(gains) + '</span>' +
                '<br>Listing and selling fees (15%): <span class="price">' + displayGold(parseInt(gains * 0.15)) + '</span>' +
                '<br>Result: <span class="price">' + displayGold(parseInt(gains * 0.85)) + '</span>');
        
        $('#gridOld .item:visible').each(function () {
            if ($(this).data('value') !== '') {
                losses += parseInt($(this).data('value'));
            }
        });
        
        
        $('#totalOld').html('Losses (listing, before fees): <span class="price">' + displayGold(losses) + '</span>' +
                '<br>Listing and selling fees (15%): <span class="price">' + displayGold(parseInt(losses * 0.15)) + '</span>' +
                '<br>Result: <span class="price">' + displayGold(parseInt(losses * 0.85)) + '</span>');
        
        //Change color based on gains or losses
        if ((gains - losses + goldDiff) >= 0) {
            $('#summary').addClass('positive').removeClass('negative');
            $('#main').addClass('overlayPositive').removeClass('overlayNegative');
        } else {
            $('#summary').addClass('negative').removeClass('positive');
            $('#main').addClass('overlayNegative').removeClass('overlayPositive');
        }
        
        goldPerHour = parseInt((((gains - losses) * 0.85) + goldDiff) * timeDiff);
        
        $('#overallGoldDifference').html(displayGold(goldDiff));
        $('#overallGains').html(displayGold(gains));
        $('#overallFees').html(displayGold(parseInt(gains * 0.15)));
        $('#overallLosses').html(displayGold(parseInt(losses * 0.85)));
        $('#overallResult').html(displayGold(parseInt((gains - losses) * 0.85) + goldDiff));
        $('#overallAverage').html(displayGold(goldPerHour));
        gphSeries.push([(new Date()).getTime(), goldPerHour / 10000]);
        
        //Update the plot
        if(gphSeries.length > maxPoints) {
            gphSeries = gphSeries.slice(1);
        }

        plot.setData([{label: 'Gold per hour', data: gphSeries}]);
        plot.setupGrid();
        plot.draw();
    }
    
    //Initialisation function, used at the begining and also when the user clicks the restart button
    function init() {
        var intervalCount = 0;
        
        //Reset variables
        startedOn = Date.now();
        initialIndex = {};
        currentIndex = {};
        gains = 0;
        losses = 0;
        gphSeries = [(new Date()).getTime(), 0];
        
        //Show / hide elements
        $('#gridNew, #gridOld').html('');
        $('#newItems .none, #oldItems .none').show();
        $('#totalNew, #totalOld').hide();
        $('#restart').hide();
        $('#stop').show();
        
        $('#startTime').html(new Date().toLocaleString());
        $('#currentTime').html(new Date().toLocaleString());
        
        if (gridNew !== undefined) {
            gridNew.isotope('destroy');
        }
        
        if (gridOld !== undefined) {
            gridOld.isotope('destroy');
        }
        
        //Setup Isotope
        var isotopeSettings = {
            itemSelector: '.item',
            layoutMode: 'fitRows',
            filter: function () {
                return itemTypes.indexOf($(this).data('type')) >= 0;
            },
            // sort by rarity by default
            sortBy: [(localStorage.getItem('sortBy') === 'value' ? 'value' : 'rarity'), 'Name'],
            getSortData: {
                rarity: function (item) {
                    return parseInt($(item).data('rarity'));
                },
                name: function (item) {
                    return $(item).data('name');
                },
                value: function (item) {
                    return parseInt($(item).data('value'));
                }
            },
            sortAscending: {
                rarity: true,
                name: true,
                value: false
            }
        };
        
        gridNew = $('#gridNew').isotope(isotopeSettings);
        gridNew.on('layoutStart', function (event, laidOutItems) {
            if (laidOutItems.length === 0) {
                $('#newItems .none').show();
                $('#totalNew').hide();
            } else {
                $('#newItems .none').hide();
                $('#totalNew').show();
            }
        });
        
        gridOld = $('#gridOld').isotope(isotopeSettings);
        gridOld.on('layoutStart', function (event, laidOutItems) {
            if (laidOutItems.length === 0) {
                $('#oldItems .none').show();
                $('#totalOld').hide();
            } else {
                $('#oldItems .none').hide();
                $('#totalOld').show();
            }
        });
        
        //Plot the gold per hour
        plot = $.plot('#graph', [{label: 'Gold per hour', data: [(new Date()).getTime(), 0]}], {
            series: {
                shadowSize: 0,	// Drawing is faster without shadows
                lines: { 
                    show: true, 
                    fill: true, 
                    lineWidth: 1
                },
                points: {
                    show: true,
                    radius: 2
                }
            },
            grid: { hoverable: true },
            xaxis: {
                mode: 'time',
                timeformat: '%H:%M%:%S',
                timezone: 'browser'
            }
        });
        
        //Get initial gold
        $.getJSON('https://api.guildwars2.com/v2/account/wallet?access_token=' + token).done(function (wallet) {
            //Display the initial amount of gold
            initialGold = wallet[0].value;
            currentGold = wallet[0].value;
            updateTotal();
            $('#initialGold').html(displayGold(initialGold));
            $('#currentGold').html(displayGold(initialGold));
            
        }).fail(failedRequest);
        
        fetchItems(true);
        updateTotal();
        
        //Start à loop. Check if new items were added or if items were removed from the account
        refreshID = setInterval(function () {
            var minutes, seconds, diff;
            
            diff = refreshRate - intervalCount;
            
            // does the same job as parseInt truncates the float
            minutes = (diff / 60) | 0;
            seconds = (diff % 60) | 0;

            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;

            $('#countdown').html('Next refresh: ' + minutes + ':' + seconds);
            updateTotal();
            
            intervalCount++;
            
            if (intervalCount === refreshRate) {
                intervalCount = 0;
                fetchItems(false);
            }
        }, 1000);
    }
    
    //Clicking the "Continue" button on the first page (API Key)
    $('#continueIntro').click(function () {
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
    
    //Clicking the "Stop" button
    $('#stop').click(function () {
        clearInterval(refreshID);
        $('#countdown').html('');
        $(this).hide();
        $('#restart').show();
    });
    
    //Clicking the "Restart" button
    $('#restart').click(function () {
        init();
    });
    
    //Returns the html for displaying gold based on a number of coppers
    function displayGold(coppers) {
        var c, s, g;
        var negative = false;
        
        if (coppers < 0) {
            negative = true;
        }
        
        coppers = Math.abs(coppers);
        
        c = coppers % 100;
        s = (coppers / 100) % 100;
        g = coppers / 10000;
        
        return ((negative ? '- ' : '') +
                parseInt(g, 10) + ' <img src="img/Gold_coin.png"> ' +
                parseInt(s, 10).toString().paddingLeft('00') + ' <img src="img/Silver_coin.png"> ' +
                parseInt(c, 10).toString().paddingLeft('00') + ' <img src="img/Copper_coin.png">');
    }
    
    //When toggling details, show/hide item description
    $('#toggleDetails').on('change', function () {
        $.when($('.description').toggle()).then(function() {
            gridNew.isotope();
            gridOld.isotope();
            //Fix layout bug
            setTimeout(function() {
                gridNew.isotope();
                gridOld.isotope();
            }, 500);
        });
        localStorage.setItem('showDetails', $(this).prop('checked'));
    });
    
    //Checking all item types
    $('#checkAllTypes').change(function () {
        if ($(this).prop('checked')) {
            $('.itemType:not(:checked)').prop('checked', true);
        } else {
            $('.itemType:checked').prop('checked', false);
        }
        
        //Save settings to localStorage
        localStorage.setItem('itemTypes', $.map($('.itemType:checked'), function (n) {
            return '#' + $(n).attr('id');
        }).join(', '));
        
        itemTypes = [];
        $('.itemType:checked').each(function() {
            itemTypes.push($(this).data('type'));
        });
        
        //Apply filter
        gridNew.isotope();
        gridOld.isotope();
    });
    
    //Toggling individual item types
    $('.itemType').on('change', function () {
        $('.' + $(this).data('type')).toggle();
        
        if (!$(this).prop('checked')) {
            $('#checkAllTypes').prop('checked', false);
        } else if ($('.itemType').length === $('.itemType:checked').length) {
            $('#checkAllTypes').prop('checked', true);
        }
        
        //Save settings to localStorage
        localStorage.setItem('itemTypes', $.map($('.itemType:checked'), function (n) {
            return '#' + $(n).attr('id');
        }).join(', '));
        
        itemTypes = [];
        $('.itemType:checked').each(function() {
            itemTypes.push($(this).data('type'));
        });
        
        //Apply filter
        gridNew.isotope();
        gridOld.isotope();
    });
    
    //Settings popup
    $('#settings').on('click', function () {
        $('#settingsPopup').toggle(200);
    });
    
    //Closing the settings popup
    $('html').on('click', function (event) {
        if (!$(event.target).closest('#settingsPopup, #settings').length) {
            $('#settingsPopup').hide();
        }
    });
    
    //When starting the application, restore values from the localStorage
    $('#apiKey').val(localStorage.getItem('APIKey'));
    
    if (localStorage.getItem('showDetails') === null) {
        localStorage.setItem('showDetails', true);
    }
    $('#toggleDetails').prop('checked', (localStorage.getItem('showDetails') === 'true' ? true : false));
    
    if (localStorage.getItem('itemTypes') === null) {
        localStorage.setItem('itemTypes', $.map($('.itemType'), function (n) {
            return '#' + $(n).attr('id');
        }).join(', '));
    }
    $('' + localStorage.getItem('itemTypes')).prop('checked', true).each(function() {
        itemTypes.push($(this).data('type'))
    });
    
    if (localStorage.getItem('sortBy') === 'value') {
        $('#sortByValue').prop('checked', true);
    } else {
        $('#sortByRarity').prop('checked', true);
    }
    
    //Changing the sort
    $('[name=sortBy]').on('change', function () {
        gridNew.isotope({sortBy: [$(this).val(), 'name']});
        gridOld.isotope({sortBy: [$(this).val(), 'name']});
        localStorage.setItem('sortBy', $(this).val());
    });
    
    $('#graph').on('plothover', function(event, pos, item) {
        if(item) {
            $('#hoverGold').html((new Date(item.datapoint[0]).toLocaleString()) + '<br>' + displayGold(item.datapoint[1]*10000) + ' per hour').css({top: item.pageY+5, left: item.pageX+5}).show();
        } else {
            $('#hoverGold').hide();
        }
    });
}());