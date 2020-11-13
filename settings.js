let autoUnselectOptions = ["None", "Total", "Potential", "Spent"];
let autoDiscardOptions = ["None", "Total", "Potential"];
let multiXpOptions = [1, 10, 100, 1000];
let settings = {
	autoUnselect: "None",
	autorun: false,
	autoDiscard: "None",
	autobuyer: true,
	multiXp: 1,
	showChallenges: false,
}

let settingMessages = {
	autoUnselect: [
		"Do not automatically remove party members",
		"Automatically remove the party member with the least experience",
		"Automatically remove the party member with the least experience potential",
		"Automatically remove the party member with the least assigned xp",
	],
	autorun: [
		"Do not automatically start run",
		"Automatically start run",
	],
	autoDiscard: [
		"Do not automatically delete units",
		"Automatically delete the unit with the least experience",
		"Automatically delete the unit with the least experience potential",
	],
	multiXp: [
		"Assign 1 experience point at once",
		"Assign up to 10 experience points at once",
		"Assign up to 100 experience points at once",
		"Assign up to 1000 experience points at once",
	],
	autobuyer: [
		"Autobuyer Off",
		"Autobuyer On",
	],
}

let lockedSettings = {
	autoUnselect: true,
	autoDiscard: true,
	autobuyer: true,
	multiXp: true,
}

function toggleSetting(label){
	if (lockedSettings[label]) return;
	if (label == "autoUnselect") {
		let index = autoUnselectOptions.findIndex(s => s == settings.autoUnselect);
		index = (index + 1) % autoUnselectOptions.length;
		settings.autoUnselect = autoUnselectOptions[index];
	} else if (label == "autoDiscard") {
		let index = autoDiscardOptions.findIndex(s => s == settings.autoDiscard);
		index = (index + 1) % autoDiscardOptions.length;
		settings.autoDiscard = autoDiscardOptions[index];
	} else if (label == "multiXp") {
		let index = multiXpOptions.findIndex(s => s == settings.multiXp);
		index = (index + 1) % 4;
		settings.multiXp = multiXpOptions[index];
		if (selectedUnit){
			selectedUnit.displayStatus();
		}
	} else {
		settings[label] = !settings[label];
	}
	displaySettings();
}

function displaySettings(){
	let options = document.querySelector(".options-col");
	options.querySelector("#auto-unselect").innerHTML = settingMessages.autoUnselect[autoUnselectOptions.findIndex(s => s == settings.autoUnselect)];
	options.querySelector("#autorun").innerHTML = settingMessages.autorun[+settings.autorun];
	options.querySelector("#auto-discard").innerHTML = settingMessages.autoDiscard[autoDiscardOptions.findIndex(s => s == settings.autoDiscard)];
	options.querySelector("#multi-xp").innerHTML = settingMessages.multiXp[multiXpOptions.findIndex(s => s == settings.multiXp)];
	options.querySelector("#autobuyer").innerHTML = settingMessages.autobuyer[+settings.autobuyer];
	options.querySelector("#configure-autobuyer").style.display = lockedSettings.autobuyer ? "none" : "block";
	// Hide locked settings.
	for (const [key, value] of Object.entries(lockedSettings)){
		options.querySelector(`#${key.replace(/([A-Z])/, "-$1").toLowerCase()}`).style.display = value ? "none" : "block";
	}
}