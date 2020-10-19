let helpMessages = {
	RemoveUnitsFromParty: ["Click on a unit to view it.  Click on an allied unit a second time to add it to your party or remove it from your party."],
	gainInactiveXp: ["When a unit is in your party but not the new unit, it gains xp at a much slower rate."],
	deathLevelDecay: ["When all your units die on a level, it gets slightly easier for the next time you challenge it.  When you beat it, it's reset to normal."],
	capBreakerCost: ["Each time you break the cap on a stat, the cost to do it again increases."],
	inactiveXpSlow: ["Inactive xp gains slow much more after they've increased xp by 10%."],
	autobuyerDecrease: ["Right click to decrease xp in the autobuyer."],
	capBreakerGet: ["You get a capbreaker whenever you defeat a boss floor."],
	loadRepeatStop: ["Loading the same floor again and again will eventually kick you out of the dungeon."],
	spendOfflineTime: ["You can spend your offline time to give a unit xp at a rate equal to your best xp/s. (Resets on starting a challenge)"],
};
let lastMessage = "";
let nextHelpMessage = 0;

function displayHelpMessage(message){
	if (!helpMessages[message][1]){
		displayMessage(helpMessages[message][0]);
		helpMessages[message][1] = true;
	}
}

function displayMessage(message){
	if (message == lastMessage) return;
	lastMessage = message;
	let messageWrapperEl = document.querySelector("#messages");
	let messageEl = document.querySelector("#message-template").cloneNode(true);
	messageEl.removeAttribute("id");
	messageEl.innerHTML = message;
	messageWrapperEl.prepend(messageEl);
}

function clearMessages(){
	let messageWrapperEl = document.querySelector("#messages");
	while (messageWrapperEl.firstChild){
		messageWrapperEl.removeChild(messageWrapperEl.lastChild);
	}
}

function showHelp(){
	let messageCount = Object.values(helpMessages).length;
	displayMessage(Object.values(helpMessages)[nextHelpMessage] + ` (${nextHelpMessage + 1}/${messageCount})`);
	nextHelpMessage = (nextHelpMessage + 1) % messageCount;
}

setTimeout(() => {
	displayMessage("Welcome to Undeterred!");
	displayMessage("You enter a cavern, deeper than you could possibly imagine.");
});
