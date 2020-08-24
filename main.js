console.log("Loading main.js")

let playerSymbols = ["&nbsp;♥", "&nbsp;♦", "&nbsp;♣", "&nbsp;♠"];
let playerUnits = [];
let currentLevel = 0;
let maxUnits = 10;
let tickInterval = null;
let loopCount = 0;
let TICK_TIME = 250;
let selectedUnit = null;
let autoBuyerUnit = new AutoBuyerUnit();
let baseStats = {
	Health: 50,
	Damage: 5,
};

function beginRun(){
	if (tickInterval) return;
	document.querySelector("#start-button").classList.add("running");
	if (playerUnits.length >= maxUnits){
		if (settings.autoDiscard){
			let minXP = playerUnits.reduce((a, unit) => !unit.preventRemoval && !unit.active && (xp = unit.getStatValue()) < a ? xp : a, Infinity);
			if (minXP == Infinity){
				return;
			}
			let unitMinXP = playerUnits.findIndex(unit => !unit.active && unit.getStatValue() == minXP);
			playerUnits.splice(unitMinXP, 1);
		} else {
			displayMessage("You can only have 10 total units - forget one by clicking the x before you can enter the caverns again.");
			return;
		}
	}
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
	loopCount++;
	partyUnits.forEach((unit, i) => {
		unit.refillHealth();
		unit.character = playerSymbols[i+1];
	})
	let newPlayerUnit = new Unit(true, "You", baseStats, "simple", true, loopCount);
	newPlayerUnit.character = playerSymbols[0];
	playerUnits.push(newPlayerUnit);
	displayCurrentUnit();
	displayAllUnits();
	currentLevel = 0;
	loadNextMap();
	tickInterval = setInterval(runTick, TICK_TIME);
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
	while (enemyDiv.firstChild){
		enemyDiv.removeChild(enemyDiv.lastChild);
	}
	maps[currentLevel].getVisibleEnemies().forEach(unit => {
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
		unitEl.querySelector(".total-xp").innerHTML = unit.getStatValue();
		unitEl.querySelector(".spendable-xp").innerHTML = unit.xp;
		unitEl.querySelector(".character").innerHTML = unit.character;
		unit.updateXP = () => {
			unitEl.querySelector(".total-xp").innerHTML = unit.getStatValue();
			unitEl.querySelector(".spendable-xp").innerHTML = unit.xp;
		}
		unitEl.querySelector(".loop-count").innerHTML = unit.loopNumber;
		unitEl.querySelector(".removal").innerHTML = unit.preventRemoval ? "Cannot be forgotten" : "Can be forgotten";
		let showKillButton = () => {
			unitEl.querySelector(".kill-button").style.display = unit.preventRemoval ? "none" : "block";
		}
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
		TICK_TIME -= 50;
		// It really shouldn't ever drop this low, but just in case...
		if (TICK_TIME < 100) TICK_TIME = 100;
		displayMessage(`Ticks are now faster!`);
	} else if (reward == "AutoBuyer") {
		displayMessage(`You have unlocked the Auto Buyer!`);
		autoBuyer = true;
	}
}

function runTick(){
	let partyUnits = playerUnits.filter(unit => unit.active);
	partyUnits.forEach(unit => unit.tick(maps[currentLevel]));
	maps[currentLevel].tick(partyUnits);
	if (maps[currentLevel].checkComplete()){
		currentLevel++;
		loadNextMap();
	}
	displayCurrentUnitStatus();
	displayEnemyUnits();
	if (selectedUnit){
		selectedUnit.displayStatus();
	}
	if (playerUnits.every(unit => unit.dead)){
		clearInterval(tickInterval);
		tickInterval = null;
		endRun();
	}
}

function grantXp(xp){
	let currentUnit = playerUnits.find(unit => unit.current);
	currentUnit.onKill(xp);
}

function endRun(){
	document.querySelector("#start-button").classList.remove("running");
	maps[currentLevel].uninstantiate();
	playerUnits.find(unit => unit.current).current = false;
	playerUnits.forEach(unit => unit.character = "");
	if (settings.autorun) beginRun();
}

setTimeout(() => {
	displaySettings();
});