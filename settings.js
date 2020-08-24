console.log("Loading settings.js")

let autoUnselectOptions = ["None", "Total", "Spent"];
let settings = {
	autoUnselect: "None",
	autorun: false,
	autoDiscard: false,
}

let settingMessages = {
	autoUnselect: [
		"Do not automatically remove party members",
		"Automatically remove the party member with the least experience",
		"Automatically remove the party member with the least assigned xp",
	],
	autorun: [
		"Do not automatically start run",
		"Automatically start run",
	],
	autoDiscard: [
		"Do not automatically delete units",
		"Automatically delete the unit with the least experience",
	],
	autoBuyer: [
		"Configure AutoBuyer settings",
	]
}

let lockedSettings = {
	autoUnselect: true,
	autoDiscard: true,
	autoBuyer: true,
}

function toggleSetting(label){
	if (lockedSettings[label]) return;
	if (label == "autoUnselect") {
		let index = autoUnselectOptions.findIndex(s => s == settings.autoUnselect);
		index = (index + 1) % 3;
		settings.autoUnselect = autoUnselectOptions[index];
	} else if (label == "autoBuyer"){
		autoBuyerUnit.display();
	} else {
		settings[label] = !settings[label];
	}
	displaySettings();
}

function displaySettings(){
	let options = document.querySelector(".options-col");
	options.querySelector("#auto-unselect").innerHTML = settingMessages.autoUnselect[autoUnselectOptions.findIndex(s => s == settings.autoUnselect)];
	options.querySelector("#autorun").innerHTML = settingMessages.autorun[+settings.autorun];
	options.querySelector("#auto-discard").innerHTML = settingMessages.autoDiscard[+settings.autoDiscard];
	options.querySelector("#auto-buyer").innerHTML = settingMessages.autoBuyer[+settings.autoBuyer];
	// Hide locked settings.
	for (const [key, value] of Object.entries(lockedSettings)){
		options.querySelector(`#${key.replace(/([A-Z])/, "-$1").toLowerCase()}`).style.display = value ? "none" : "block";
	}
}