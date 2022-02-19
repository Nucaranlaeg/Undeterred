let helpMessages = {
	"Remove Units": ["Click on a unit to view it.  Click on an allied unit a second time to add it to your party or remove it from your party."],
	"Units in Party": ["Green units are in your party, while gray ones are not."],
	"Use XP": ["Click on a stat to increase it if you have the xp available."],
	"Rounding Errors": ["When all your units die on a level, it gets slightly easier for the next time you challenge it.  When you beat it, it's reset to normal.  It's not a rounding error."],
	"Capbreaker Cost": ["Each time you break the cap on a stat, the cost to do it again on the same unit increases."],
	"XP Gains Slowing": ["When a unit is in your party but not the new unit, it gains xp at a much slower rate.  Xp gains for units which aren't the new one slow much more after they've increased xp by 10%."],
	"Autobuyer Decrease": ["Right click to decrease xp in the autobuyer."],
	"Get Capbreakers": ["You get a capbreaker whenever you defeat a boss floor."],
	"Max Loads": ["Loading the same floor again and again will eventually kick you out of the dungeon."],
	"Spend Offline Time": ["You can spend your offline time to give a unit xp at a rate equal to your best xp/s. (Resets on starting a challenge)"],
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

function showHints(){
	helpClear();
	let selector = document.querySelector("#help-selector");
	for (const [key, value] of Object.entries(helpMessages)){
		let hintSelect = document.createElement("div");
		hintSelect.classList.add("help-item");
		hintSelect.innerHTML = key;
		hintSelect.onclick = event => {
			document.querySelectorAll(".help-item.active").forEach(el => el.classList.remove("active"));
			event.target.classList.add("active");
			document.querySelector("#help-description").innerHTML = value[0];
		};
		selector.appendChild(hintSelect);
	}
}

function helpClear(){
	document.querySelector("#help-description").innerHTML = "";
	let selector = document.querySelector("#help-selector");
	while (selector.firstChild){
		selector.removeChild(selector.lastChild);
	}
	document.querySelector("#help-level-wrapper").style.display = "none";
	document.querySelector("#help-compare").style.display = "none";
	let stats = document.querySelector("#help-stats");
	while (stats.firstChild){
		stats.removeChild(stats.lastChild);
	}
}
