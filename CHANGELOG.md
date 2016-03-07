# 1.3 (2016-03-06)
- Added Heart of thorns currencies.
- If an API key is saved, you are now redirected automatically to the main screen (you skip the "login" part).
- You can now specify your API key in the URL via the "key" argument. For example: http://jfnaud.github.io/Guild-Wars-2-Gold-per-hour/?key=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

# 1.2.2 (2015-10-12)
- Integrated Google Analytics.
- The ping to Github for checking if a new version is available now happens every 30 minutes instead of 3 minutes.

# 1.2.1 (2015-09-24)
- Fixed the Total acquired gold series on the graph.

# 1.2 (2015-09-24)
- The gold over time graph now also displays the total acquired gold. 
- Better layout for the other currencies (now displayed in a table). Also, the currencies should always be displayed in english now.
- A new graph displays currencies acquisition over time. You can hide the currencies you don't want on the graph by unchecking them. Your checked currencies will be saved for next time.
- A new option lets you select how the gold per hour is calculated. You can either consider all the time elapsed since you've started the application, or the time elapsed while the application has been running. This second option can be useful if you start the application, take a long break ("Stop" button), then resume later.

# 1.1 (2015-09-20)
- Better and more specific error messages. Some people had the generic "Invalid API key" even if that wasn't the cause of the problem. Also, the application won't stop when an error occurs.
- When you stop the application, you have now two options. You can start over (resets the graph and all the acquired and lost items) or resume.
- A new section "Other currencies" is now available. All the currencies of the wallet are now tracked as well.
- The application will now check automatically if a new version is available. If so, a popup will inform the user.

# 1.0 (2015-09-18)
Initial release