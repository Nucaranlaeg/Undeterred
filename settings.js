let autoUnselectOptions = ["None", "Total", "Spent"];
let multiXpOptions = [1, 10, 100, Infinity];
let settings = {
	autoUnselect: "None",
	autorun: false,
	autoDiscard: false,
	autobuyer: true,
	multiXp: 1,
	showChallenges: false,
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
		"Do not automatically forget units",
		"Automatically forget the unit with the least experience",
	],
	multiXp: [
		"Assign 1 experience point at once",
		"Assign up to 10 experience points at once",
		"Assign up to 100 experience points at once",
		"Assign all experience points at once",
	],
	autobuyer: [
		"Configure Autobuyer (Off)",
		"Configure Autobuyer (On)",
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
		index = (index + 1) % 3;
		settings.autoUnselect = autoUnselectOptions[index];
	} else if (label == "multiXp") {
		let index = multiXpOptions.findIndex(s => s == settings.multiXp);
		index = (index + 1) % 3;
		settings.multiXp = multiXpOptions[index];
	} else if (label == "autobuyer"){
		if (selectedUnit == autobuyerUnit){
			settings.autobuyer = !settings.autobuyer;
		}
		autobuyerUnit.display();
		selectedUnit = autobuyerUnit;
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
	options.querySelector("#multi-xp").innerHTML = settingMessages.multiXp[multiXpOptions.findIndex(s => s == settings.multiXp)];
	options.querySelector("#autobuyer").innerHTML = settingMessages.autobuyer[+settings.autobuyer];
	// Hide locked settings.
	for (const [key, value] of Object.entries(lockedSettings)){
		options.querySelector(`#${key.replace(/([A-Z])/, "-$1").toLowerCase()}`).style.display = value ? "none" : "block";
	}
}