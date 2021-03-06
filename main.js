let playerSymbols = ["&nbsp;♥", "&nbsp;♦", "&nbsp;♣", "&nbsp;♠"];
let playerPosIndex = [1,2,3,0];
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
let autobuyerUnits = [new AutobuyerUnit(0), new AutobuyerUnit(1), new AutobuyerUnit(2), new AutobuyerUnit(3)];
let viewedAutobuyerUnit = 0;
let unlockedRoles = false;
let base_stat_value = 211;
let bestLevel = 0;
// Offline stuff
let offlineData = {
	xpPerSec: 0,
	offlineTime: 0,
	lastTickTime: Date.now(),
}
let offlineTimeEl = document.querySelector("#offline-time");
let currentXpPerSecEl = document.querySelector("#current-xp-per-sec");
let runStart = null;
let runXp = 0;
let lagTime = 0;
let version = "1.2.0";
document.title = `Undeterred V${version}`;
// For keeping enemy listings available after run completion
let oldEnemies = [];

function calculateBaseStatValue(){
	base_stat_value += (new Unit(true, "Adventurer", baseStats)).getSpentStatValue();
}
calculateBaseStatValue();

function beginRun(){
	if (tickInterval) return;
	let partyUnits = playerUnits.filter(unit => unit.active);
	let lastUnitRole = 0;
	while (partyUnits.length > 3){
		let removedUnit = null;
		if (settings.autoUnselect == "Total"){
			let minXP = playerUnits.reduce((a, unit) => unit.active && (xp = unit.getStatValue()) < a ? xp : a, Infinity);
			removedUnit = playerUnits.find(unit => unit.active && unit.getStatValue() == minXP);
		} else if (settings.autoUnselect == "Potential"){
			let minXP = playerUnits.reduce((a, unit) => unit.active && unit.deathXp < a ? unit.deathXp : a, Infinity);
			removedUnit = playerUnits.find(unit => unit.active && unit.deathXp == minXP);
		} else if (settings.autoUnselect == "Spent"){
			let minXP = playerUnits.reduce((a, unit) => unit.active && (xp = unit.getSpentStatValue()) < a ? xp : a, Infinity);
			let minTotalXP = playerUnits.reduce((a, unit) => unit.active && unit.getSpentStatValue() == minXP && (xp = unit.getStatValue()) < a ? xp : a, Infinity);
			removedUnit = playerUnits.find(unit => unit.active && unit.getStatValue() == minTotalXP);
		} else {
			displayMessage("You must remove a unit from your party to enter the caverns again - you can only have 3 old units in your party.")
			displayHelpMessage("Remove Units");
			return;
		}
		if (removedUnit) {
			let position = playerUnits.filter(unit => unit.active).findIndex(unit => unit == removedUnit);
			removedUnit.active = false;
			lastUnitRole = removedUnit.role;
			playerPosIndex = [...playerPosIndex.slice(0, position), ...playerPosIndex.slice(position + 1), playerPosIndex[position]];
		}
		partyUnits = playerUnits.filter(unit => unit.active);
	}
	partyUnits = playerUnits.filter(unit => unit.active);
	while (playerUnits.length >= maxUnits){
		if (settings.autoDiscard == "Total"){
			let minXP = playerUnits.reduce((a, unit) => !unit.preventRemoval && !unit.active && (xp = unit.getStatValue()) < a ? xp : a, Infinity);
			if (minXP == Infinity){
				return;
			}
			let unitMinXP = playerUnits.findIndex(unit => !unit.active && unit.getStatValue() == minXP && !unit.preventRemoval);
			playerUnits.splice(unitMinXP, 1);
		} else if (settings.autoDiscard == "Potential"){
			let minXP = playerUnits.reduce((a, unit) => !unit.preventRemoval && !unit.active && unit.deathXp < a ? unit.deathXp : a, Infinity);
			if (minXP == Infinity){
				return;
			}
			let unitMinXP = playerUnits.findIndex(unit => !unit.active && unit.deathXp == minXP && !unit.preventRemoval);
			playerUnits.splice(unitMinXP, 1);
		} else {
			displayMessage("You can only have 10 total units - delete one by clicking the x before you can enter the caverns again.");
			return;
		}
	}
	runStart = Date.now();
	runXp = 0;
	document.querySelector("#start-button").classList.add("running");
	loopCount++;
	let newPlayerUnit = new Unit(true, "Adventurer", baseStats, autobuyerUnits[lastUnitRole].ai.name, true, loopCount, lastUnitRole);
	newPlayerUnit.spell = autobuyerUnits[newPlayerUnit.role].spell ? new spells[autobuyerUnits[newPlayerUnit.role].spell.name]() : null;
	playerUnits.push(newPlayerUnit);
	partyUnits = playerUnits.filter(unit => unit.active);
	resetHealth(partyUnits);
	displaySelectedUnit();
	currentLevel = 0;
	loadNextMap();
	tickInterval = setInterval(runTick, tickTime);
}

function loadNextMap(){
	oldEnemies.forEach(e => e.removeSummary());
	oldEnemies = [];
	let partyUnits = playerUnits.filter(unit => unit.active);
	partyUnits.forEach((unit, i) => {
		unit.character = playerSymbols[playerPosIndex[i % 4]];
	});
	displayAllUnits();
	// On moving to the next level, all player units come back to life
	// Unless in the Restless challenge.
	if (!activeChallenge || activeChallenge.name != "Restless"){
		resetHealth(partyUnits);
	}
	maps[currentLevel].instantiate(partyUnits);
	maps[currentLevel].draw();
	maps[currentLevel].drawCreatures(partyUnits);
	maps[currentLevel].getVision(partyUnits);
	if (currentLevel > bestLevel){
		bestLevel = currentLevel;
	}
}

function resetHealth(partyUnits){
	partyUnits.forEach(unit => unit.dead = false);
	partyUnits.forEach(unit => unit.refillHealth());
	document.querySelector("#conditions").innerHTML = "";
}

function displaySelectedUnit(){
	if (selectedUnit){
		selectedUnit.display();
	}
}

function displaySelectedUnitStatus(){
	if (selectedUnit){
		selectedUnit.displayStatus();
	}
}

function displayEnemyUnits(){
	let enemyDiv = document.querySelector("#enemy-creatures");
	let unitSummaryTemplate = document.querySelector("#enemy-summary-template");
	maps[currentLevel].getVisibleEnemies().forEach(unit => {
		if (unit.enemySummaryNode) return;
		let unitEl = unitSummaryTemplate.cloneNode(true);
		unitEl.removeAttribute("id");
		unitEl.querySelector(".name").innerHTML = unit.name;
		unitEl.querySelector(".total-xp").innerHTML = unit.xp;
		unitEl.querySelector(".character").innerHTML = unit.character || "";
		unitEl.onclick = () => {
			selectedUnit = unit;
			displaySelectedUnit();
		}
		enemyDiv.append(unitEl);
		unit.enemySummaryNode = unitEl;
	});
}

function displayAllUnits(){
	let partyUnits = playerUnits.filter(unit => unit.active);
	partyUnits.forEach((unit, i) => {
		unit.character = playerSymbols[playerPosIndex[i % 4]];
	});
	let partyFull = playerUnits.reduce((a, unit) => unit.active + a, 0) == 4;
	let partyDiv = document.querySelector("#party");
	let otherAdventurersDiv = document.querySelector("#other-adventurers");
	let unitSummaryTemplate = document.querySelector("#unit-summary-template");
	while (partyDiv.firstChild){
		partyDiv.removeChild(partyDiv.lastChild);
	}
	while (otherAdventurersDiv.firstChild){
		otherAdventurersDiv.removeChild(otherAdventurersDiv.lastChild);
	}
	playerUnits.forEach(unit => {
		let unitEl = unitSummaryTemplate.cloneNode(true);
		unitEl.removeAttribute("id");
		unitEl.querySelector(".total-xp").innerHTML = Math.floor(unit.getStatValue());
		unitEl.querySelector(".spendable-xp").innerHTML = Math.floor(unit.xp);
		if (!unit.current) unitEl.querySelector(".death-xp").innerHTML = `(${Math.floor(unit.deathXp)})`;
		unitEl.querySelector(".character").innerHTML = unit.character;
		unit.updateXP = () => {
			unitEl.querySelector(".total-xp").innerHTML = Math.floor(unit.getStatValue());
			unitEl.querySelector(".spendable-xp").innerHTML = Math.floor(unit.xp);
		}
		unitEl.querySelector(".loop-count").innerHTML = unit.loopNumber;
		unitEl.querySelector(".kill-button").style.display = unit.preventRemoval ? "none" : "block";
		let toggleInParty = e => {
			e.stopPropagation();
			if (tickInterval) return;
			unit.active = !unit.active;
			displayAllUnits();
		};
		let partyAssignEl = unitEl.querySelector(".party-assign");
		if (unit.active){
			unitEl.classList.add("active");
			partyAssignEl.innerHTML = "Remove from party";
			partyAssignEl.onclick = toggleInParty;
			} else {
			partyAssignEl.innerHTML = "Add to party";
			if (partyFull){
				partyAssignEl.classList.add("disabled");
			} else {
				partyAssignEl.onclick = toggleInParty;
			}
		}
		if (unit.current){
			unitEl.classList.add("current");
		}
		unitEl.onclick = () => {
			selectedUnit = unit;
			displaySelectedUnit();
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
		if (unit.active){
			unitEl.style.order = playerSymbols.findIndex(char => char == unit.character);
			unitEl.draggable = true;
			unitEl.addEventListener("dragstart", event => {
				let oldUnit = document.querySelector("#drag-unit");
				if (oldUnit) oldUnit.removeAttribute("id");
				unitEl.id = "drag-unit";
				event.dataTransfer.setData("text/plain", unitEl.style.order);
			});
			unitEl.addEventListener("dragover", (event) => {
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
			});
			unitEl.addEventListener("drop", event => {
				event.preventDefault();
				let switch1 = +unitEl.style.order;
				let switch2 = +event.dataTransfer.getData("text/plain");
				try {
					document.querySelector("#drag-unit").style.order = switch1;
				} catch {
					return;
				}
				playerPosIndex = playerPosIndex.map(x => x == switch1 ? switch2 : x == switch2 ? switch1 : x);
				unitEl.style.order = switch2;
			});
			partyDiv.append(unitEl);
		} else {
			otherAdventurersDiv.append(unitEl);
		}
	});
}

function applyReward(reward){
	if ((new Unit(false, "", {})).stats[reward] !== undefined){
		// Check if the reward is a stat.
		if (reward == "CriticalDamage"){
			baseStats[reward] = 2;
		} else if (reward == "Mana"){
			baseStats[reward] = 100;
			autobuyerUnits.forEach(unit => {
				if (unit.stats.Mana.value == 0) unit.stats.Mana.addBase(100);
			});
		} else {
			baseStats[reward] = 0;
		}
		displayMessage(`You have learned the ${reward} skill!`);
		if (bestLevel > 30){
			applyReward("Autobuyer " + reward);
		}
	} else if (lockedSettings[reward]) {
		// Check if reward is a setting.
		lockedSettings[reward] = false;
		if (reward == "autoUnselect"){
			lockedSettings["autoDiscard"] = false;
		}
		displayMessage(`You have unlocked the ${reward} setting!`);
		displaySettings();
	} else if (reward == "FasterTicks") {
		tickTime *= 0.8;
		// It really shouldn't ever drop this low, but just in case...
		// With 4 FasterTicks, tickTime will be 102.4.
		if (tickTime < 100) tickTime = 100;
		displayMessage(`Ticks are now 20% faster!`);
	} else if (reward == "Roles") {
		unlockedRoles = true;
		displayMessage(`You can now assign party roles and have 4 distinct autobuyers!`);
	} else if (reward == "BuyCapbuyers") {
		unlockedCapbuyerbuyer = true;
		displayMessage(`You can now spend xp to buy more capbuyers! (NOT IMPLEMENTED)`);
	} else if (reward.split(" ")[0] == "Autobuyer") {
		let stat = reward.split(" ")[1];
		displayMessage(`You have unlocked the Autobuyer for ${stat}!`);
		if (lockedSettings["autobuyer"]){
			displayMessage(`Decrease autobuyer values by right-clicking on the relevant stat.`);
		}
		lockedSettings["autobuyer"] = false;
		displaySettings();
		autobuyerUnits.forEach(autobuyer => autobuyer.unlock(stat));
		if (reward == "Autobuyer Damage"){
			document.querySelector("#tutorial5").style.display = "block";	
		}
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
		displaySelectedUnitStatus();
		fillAIDropdown();
	} else if (reward.split(" ")[0] == "Spell") {
		let spell = reward.split(" ")[1];
		displayMessage(`You have unlocked the ${spell} spell!`);
		lockedSpells[spell] = false;
		displaySelectedUnitStatus();
		fillSpellDropdown();
	}
}

function runTick(){
	lagTime += Date.now() - offlineData.lastTickTime - tickTime;
	offlineData.lastTickTime = Date.now();
	if (lagTime > tickTime){
		offlineData.offlineTime += lagTime - tickTime;
		offlineTimeEl.innerHTML = formatNumber(offlineData.offlineTime / 1000);
		lagTime = tickTime;
	}
	// If the game is running slowly, do an additional tick.
	// This prevents building up offline time if the game is running slowly.
	if (lagTime == tickTime){
		lagTime = 0;
		runTick();
	}
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
			displaySelectedUnit();
		}
		loadNextMap();
		save();
	}
	displaySelectedUnitStatus();
	displayEnemyUnits();
	if (playerUnits.every(unit => unit.dead || !unit.active)){
		endRun();
	}
	let rate = runXp / ((Date.now() - runStart) / 1000);
	document.querySelector("#current-xp-per-sec").innerHTML = formatNumber(rate);
}

function grantXp(xp){
	playerUnits.forEach(unit => {
		if (unit.active) unit.onKill(xp);
	});
	runXp += xp;
	let rate = runXp / ((Date.now() - runStart) / 1000);
		if (rate > offlineData.xpPerSec) {
		offlineData.xpPerSec = rate;
		document.querySelector("#xp-per-sec").innerHTML = formatNumber(offlineData.xpPerSec);
	}
}

function stopRun(){
	document.querySelector("#start-button").classList.remove("running");
	maps[currentLevel].uninstantiate();
	let currentUnit = playerUnits.find(unit => unit.current);
	if (currentUnit) {
		currentUnit.current = false;
		currentUnit.deathXp = currentUnit.getStatValue();
	}
	currentLevel = 0;
	clearInterval(tickInterval);
	tickInterval = null;
	displayAllUnits();
	playerUnits.forEach(unit => unit.character = "");
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