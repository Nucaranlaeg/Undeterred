let playerSymbols = ["&nbsp;♥", "&nbsp;♦", "&nbsp;♣", "&nbsp;♠"];
let playerUnits = [];
let currentLevel = 0;
let maxUnits = 10;
let tickInterval = null;
let loopCount = 0;
let tickTime = 250;
let selectedUnit = null;
let baseStats = {
	Health: 50,
	Damage: 5,
};
let autobuyerUnit = new AutobuyerUnit();
// To be implemented; speeds up ticks to make up for missed time.
let fastTime = 0;
let base_stat_value = 211;
let bestLevel = 0;

function calculateBaseStatValue(){
	base_stat_value += (new Unit(true, "You", baseStats)).getSpentStatValue();
}
calculateBaseStatValue();

function beginRun(){
	if (tickInterval) return;
	document.querySelector("#start-button").classList.add("running");
	let partyUnits = playerUnits.filter(unit => unit.active);
	if (partyUnits.length > 3){
		if (settings.autoUnselect == "Total"){
			let minXP = playerUnits.reduce((a, unit) => unit.active && (xp = unit.getStatValue()) < a ? xp : a, Infinity);
			playerUnits.find(unit => unit.active && unit.getStatValue() == minXP).active = false;
		} else if (settings.autoUnselect == "Spent"){
			let minXP = playerUnits.reduce((a, unit) => unit.active && (xp = unit.getSpentStatValue()) < a ? xp : a, Infinity);
			let minTotalXP = playerUnits.reduce((a, unit) => unit.active && unit.getSpentStatValue() == minXP && (xp = unit.getStatValue()) < a ? xp : a, Infinity);
			playerUnits.find(unit => unit.active && unit.getStatValue() == minTotalXP).active = false;
		} else {
			displayMessage("You must remove a unit from your party to enter the caverns again.")
			displayHelpMessage("RemoveUnitsFromParty");
			return;
		}
	}
	partyUnits = playerUnits.filter(unit => unit.active);
	if (playerUnits.length >= maxUnits){
		if (settings.autoDiscard){
			let minXP = playerUnits.reduce((a, unit) => !unit.preventRemoval && !unit.active && (xp = unit.getStatValue()) < a ? xp : a, Infinity);
			if (minXP == Infinity){
				return;
			}
			let unitMinXP = playerUnits.findIndex(unit => !unit.active && unit.getStatValue() == minXP && !unit.preventRemoval);
			playerUnits.splice(unitMinXP, 1);
		} else {
			displayMessage("You can only have 10 total units - forget one by clicking the x before you can enter the caverns again.");
			return;
		}
	}
	loopCount++;
	partyUnits.forEach((unit, i) => {
		unit.refillHealth();
		unit.character = playerSymbols[i+1];
	})
	let newPlayerUnit = new Unit(true, "You", baseStats, autobuyerUnit.ai.name, true, loopCount);
	newPlayerUnit.character = playerSymbols[0];
	playerUnits.push(newPlayerUnit);
	displayCurrentUnit();
	displayAllUnits();
	currentLevel = 0;
	loadNextMap();
	tickInterval = setInterval(runTick, tickTime);
}

function loadNextMap(){
	let partyUnits = playerUnits.filter(unit => unit.active).reverse();
	// On moving to the next level, all player units come back to life
	partyUnits.forEach(unit => unit.dead = false);
	partyUnits.forEach(unit => unit.refillHealth());
	maps[currentLevel].instantiate(partyUnits);
	maps[currentLevel].draw();
	maps[currentLevel].drawCreatures(partyUnits);
	maps[currentLevel].getVision(partyUnits);
	if (currentLevel > bestLevel){
		bestLevel = currentLevel;
	}
}

function displayCurrentUnit(){
	playerUnits.find(unit => unit.current).display();
}

function displayCurrentUnitStatus(){
	playerUnits.find(unit => unit.current).displayStatus();
}

function displayEnemyUnits(){
	let enemyDiv = document.querySelector("#enemy-creatures");
	let unitSummaryTemplate = document.querySelector("#enemy-summary-template");
	// while (enemyDiv.firstChild){
	// 	enemyDiv.removeChild(enemyDiv.lastChild);
	// }
	maps[currentLevel].getVisibleEnemies().forEach(unit => {
		if (unit.enemySummaryNode) return;
		let unitEl = unitSummaryTemplate.cloneNode(true);
		unitEl.removeAttribute("id");
		unitEl.querySelector(".name").innerHTML = unit.name;
		unitEl.querySelector(".total-xp").innerHTML = unit.xp;
		unitEl.querySelector(".character").innerHTML = unit.character || "";
		unitEl.onclick = () => {
			unit.display();
			selectedUnit = unit;
		}
		enemyDiv.append(unitEl);
		unit.enemySummaryNode = unitEl;
	});
}

function displayAllUnits(){
	let partyDiv = document.querySelector("#party");
	let unitSummaryTemplate = document.querySelector("#unit-summary-template");
	while (partyDiv.firstChild){
		partyDiv.removeChild(partyDiv.lastChild);
	}
	playerUnits.forEach(unit => {
		let unitEl = unitSummaryTemplate.cloneNode(true);
		unitEl.removeAttribute("id");
		unitEl.querySelector(".total-xp").innerHTML = Math.floor(unit.getStatValue());
		unitEl.querySelector(".spendable-xp").innerHTML = Math.floor(unit.xp);
		unitEl.querySelector(".character").innerHTML = unit.character;
		unit.updateXP = () => {
			unitEl.querySelector(".total-xp").innerHTML = Math.floor(unit.getStatValue());
			unitEl.querySelector(".spendable-xp").innerHTML = Math.floor(unit.xp);
		}
		unitEl.querySelector(".loop-count").innerHTML = unit.loopNumber;
		unitEl.querySelector(".removal").innerHTML = unit.preventRemoval ? "Cannot be forgotten" : "Can be forgotten";
		let showKillButton = () => {
			unitEl.querySelector(".kill-button").style.display = unit.preventRemoval ? "none" : "block";
		}
		showKillButton();
		if (unit.active){
			unitEl.classList.add("active");
		}
		if (unit.current){
			unitEl.classList.add("current");
		}
		unitEl.onclick = () => {
			if (selectedUnit == unit && tickInterval === null){
				unit.active = !unit.active;
				if (unit.active){
					unitEl.classList.add("active");
				} else {
					unitEl.classList.remove("active");
				}
			}
			unit.display();
			selectedUnit = unit;
		}
		unitEl.querySelector(".removal").onclick = e => {
			e.stopPropagation();
			unit.preventRemoval = !unit.preventRemoval;
			unitEl.querySelector(".removal").innerHTML = unit.preventRemoval ? "Cannot be forgotten" : "Can be forgotten";
			showKillButton();
		}
		unitEl.querySelector(".kill-button").onclick = e => {
			e.stopPropagation();
			if (unit.preventRemoval || (unit.active && tickInterval !== null) || playerUnits.length == 1) return;
			let unitIndex = playerUnits.findIndex(u => u == unit);
			if (unitIndex > -1){
				playerUnits.splice(unitIndex, 1);
				displayAllUnits();
			}
		}
		partyDiv.append(unitEl);
	});
}

function applyReward(reward){
	if ((new Unit(false, "", {})).stats[reward] !== undefined){
		// Check if the reward is a stat.
		baseStats[reward] = 0;
		displayMessage(`You have learned the ${reward} skill!`);
	} else if (lockedSettings[reward]) {
		// Check if reward is a setting.
		lockedSettings[reward] = false;
		displayMessage(`You have unlocked the ${reward} setting!`);
		displaySettings();
	} else if (reward == "FasterTicks") {
		tickTime *= 0.8;
		// It really shouldn't ever drop this low, but just in case...
		// With 4 FasterTicks, tickTime will be 102.4.
		if (tickTime < 100) tickTime = 100;
		displayMessage(`Ticks are now 20% faster!`);
	} else if (reward.split(" ")[0] == "Autobuyer") {
		let stat = reward.split(" ")[1];
		displayMessage(`You have unlocked the Autobuyer for ${stat}!`);
		if (lockedSettings["autobuyer"]){
			displayMessage(`Decrease autobuyer values by right-clicking on the relevant stat.`);
		}
		lockedSettings["autobuyer"] = false;
		displaySettings();
		autobuyerUnit.unlock(stat);
	} else if (reward.split(" ")[0] == "Challenge") {
		let challenge = reward.split(" ")[1];
		displayMessage(`You have unlocked the ${challenge} challenge!`);
		settings.showChallenges = true;
		challenges[challenge].locked = false;
		displayChallenges();
	} else if (reward.split(" ")[0] == "AI") {
		let ai = reward.split(" ")[1];
		displayMessage(`You have unlocked the ${ai} ai option!`);
		ais[ai].locked = false;
		displayCurrentUnitStatus();
		if (selectedUnit){
			selectedUnit.displayStatus();
		}
		fillAIDropdown();
	}
}

function runTick(){
	let partyUnits = playerUnits.filter(unit => unit.active);
	partyUnits.forEach(unit => unit.tick());
	maps[currentLevel].tick(partyUnits);
	if (maps[currentLevel].checkComplete()){
		grantXp(challenges.PlusTwoLevels.bestFloor / 2);
		displayChallenges();
		currentLevel++;
		if (currentLevel % 10 == 0){
			// Get a capBreaker each time a boss level is defeated.
			playerUnits.find(unit => unit.current).capBreakers++;
			displayCurrentUnit();
		}
		loadNextMap();
		save();
	}
	displayCurrentUnitStatus();
	displayEnemyUnits();
	if (selectedUnit){
		selectedUnit.displayStatus();
	}
	if (playerUnits.every(unit => unit.dead || !unit.active)){
		endRun();
	}
}

function grantXp(xp){
	let currentUnit = playerUnits.find(unit => unit.current);
	currentUnit.onKill(xp);
}

function stopRun(){
	document.querySelector("#start-button").classList.remove("running");
	maps[currentLevel].uninstantiate();
	let currentUnit = playerUnits.find(unit => unit.current);
	if (currentUnit) {
		currentUnit.current = false;
	}
	playerUnits.forEach(unit => unit.character = "");
	currentLevel = 0;
	clearInterval(tickInterval);
	tickInterval = null;
	displayAllUnits();
	save();
}

function endRun(){
	stopRun();
	if (settings.autorun) beginRun();
}

setTimeout(() => {
	displaySettings();
	displayChallenges();
});