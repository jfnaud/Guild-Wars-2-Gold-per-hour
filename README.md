# Guild-Wars-2-Gold-per-hour
Tool using the official ArenaNet API to estimate how much gold a player is making while playging Guild Wars 2.

To get started, you must create an API key in the Applications tab of your [account](https://account.arena.net/login). Make sure you grant the following permissions: wallet, tradingpost, account, inventories and characters.

The Settings popup lets you customize the interface and how the application works. Any setting you change will be saved locally and applied automatically next time.

**Things to keep in mind:**
- The data is fetched once every 3 minutes.
- The data from the API is not live (in real time). **Sometimes it might take 2 or even 3 refreshes before an item appears.** Please be patient :)
- Multiple APIs are called to access the current state of your account. These APIs are not synchronized between themselves. That means for example that when you deposit an item in your bank, the "Characters" API still thinks you have the item in your inventory. Then, the "Bank" API might refresh faster so the item appears to be in both places. Eventually, both APIs will refresh and the item will be counted only once.
- Currently, your guild banks and the trading post delivery box are **not accessible**. That means that if you deposit an item in your guild bank, it will appear as a lost item. For the same reason, if you buy an item on the trading post and you don't collect it, it will never show in your acquired items.