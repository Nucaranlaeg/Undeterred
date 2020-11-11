function trySave(){
	if (!tickInterval) save();
}

function save(){
	let saveGame = {
		version,
		settings,
		lockedSettings,
		loopCount,
		baseStats,
		tickTime,
		currentLevel,
		bestLevel,
		offlineData,
		units: playerUnits.map(unit => {
			return {
				stats: Object.values(unit.stats).filter(stat => !stat.locked).map(stat => {
					return {
						name: stat.getQualifiedName(),
						cap: stat.cap,
						value: stat.value,
						breaks: stat.breaks,
					};
				}),
				loopNumber: unit.loopNumber,
				capBreakers: unit.capBreakers,
				active: unit.active,
				current: unit.current,
				xp: unit.xp,
				deathXp: unit.deathXp,
				ai: unit.ai.name,
				preventRemoval: unit.preventRemoval,
				role: unit.role,
			};
		}),
		autobuy: autobuyerUnits.map(autobuyer => {
			return {
				stats: Object.values(autobuyer.stats).filter(stat => !stat.locked).map(stat => {
					return {
						name: stat.getQualifiedName(),
						cap: stat.cap,
						value: stat.value,
						breaks: stat.breaks,
					};
				}),
				capBreakersUsed: autobuyer.capBreakersUsed,
				ai: autobuyer.ai.name,
			};
		}),
		unlockedRoles,
		activeChallenge: activeChallenge ? activeChallenge.name.replace(/ /g, "") : "",
		challenges: Object.entries(challenges).map(challenge => {
			return {
				name: challenge[0],
				locked: challenge[1].locked,
				bestFloor: challenge[1].bestFloor,
			};
		}),
		ais: Object.entries(ais).map(ai => {
			return {
				name: ai[0],
				locked: ai[1].locked,
			};
		}),
		maps: maps.map(map => {
			return {
				deaths: map.deaths,
				conquered: map.conquered,
			};
		}),
	}
	localStorage.save = btoa(JSON.stringify(saveGame));
}

function load(){
	if (localStorage.save === undefined){
		document.querySelector("#tutorial1").style.display = "block";
		return;
	}
	clearInterval(tickInterval);
	let saveGame = JSON.parse(atob(localStorage.save));
	for (const [key, value] of Object.entries(saveGame.settings)){
		settings[key] = value;
	}
	for (const [key, value] of Object.entries(saveGame.lockedSettings)){
		lockedSettings[key] = value;
	}
	loopCount = saveGame.loopCount;
	baseStats = saveGame.baseStats;
	tickTime = saveGame.tickTime;
	currentLevel = saveGame.currentLevel;
	bestLevel = saveGame.bestLevel;
	offlineData = saveGame.offlineData;
	offlineData.offlineTime += Date.now() - offlineData.lastTickTime - tickTime;
	offlineData.lastTickTime = Date.now();
	offlineTimeEl.innerHTML = formatNumber(offlineData.offlineTime / 1000);
	document.querySelector("#xp-per-sec").innerHTML = formatNumber(offlineData.xpPerSec);
	if (!maps[currentLevel]) currentLevel = 0;
	playerUnits = saveGame.units.map(unitData => {
		let unit = new Unit(true, "Adventurer", {}, unitData.ai, false, unitData.loopNumber);
		unitData.stats.forEach(stat => {
			unit.stats[stat.name].cap = stat.cap || Infinity;
			unit.stats[stat.name].value = stat.value;
			unit.stats[stat.name].locked = false;
			unit.stats[stat.name].breaks = stat.breaks;
		});
		unit.capBreakers = unitData.capBreakers;
		unit.active = unitData.active;
		unit.current = unitData.current;
		unit.xp = unitData.xp;
		unit.deathXp = unitData.deathXp;
		unit.preventRemoval = unitData.preventRemoval;
		unit.role = unitData.role;
		return unit;
	});
	// Load autobuyer
	// Should potentially use same system as loading units.
	autobuyerUnits.forEach(unit => {
		Object.entries(baseStats).forEach(stat => {
			unit.stats[stat[0]].value = stat[1];
		});
	});
	saveGame.autobuy.forEach((autobuyer, index) => {
		autobuyer.stats.forEach(stat => {
			autobuyerUnits[index].stats[stat.name].cap = stat.cap || Infinity;
			autobuyerUnits[index].stats[stat.name].value = stat.value;
			autobuyerUnits[index].stats[stat.name].locked = false;
			autobuyerUnits[index].stats[stat.name].breaks = stat.breaks;
		});
		autobuyerUnits[index].capBreakersUsed = autobuyer.capBreakersUsed;
		autobuyerUnits[index].ai = ais[autobuyer.ai];
	});
	unlockedRoles = saveGame.unlockedRoles;

	activeChallenge = challenges[saveGame.activeChallenge] || null;
	saveGame.challenges.forEach(challengeData => {
		let challenge = challenges[challengeData.name];
		challenge.locked = challengeData.locked;
		challenge.bestFloor = challengeData.bestFloor;
	});
	saveGame.ais.forEach(saveAi => {
		ais[saveAi.name].locked = saveAi.locked;
	});
	fillAIDropdown();
	for (let i = 0; i < maps.length && i < saveGame.maps.length; i++){
		maps[i].deaths = saveGame.maps[i].deaths;
		maps[i].conquered = saveGame.maps[i].conquered;
	}
	
	// Do version-specific stuff
	if (!saveGame.version || saveGame.version < "1.0.3"){
		bestLevel = 0;
		for (let i = 0; i < maps.length && i < saveGame.maps.length; i++){
			if (maps[i].reward != "FasterTicks"){
				maps[i].conquered = false;
			}
		}
		document.querySelector("#tutorial1").style.display = "block";
	}
	
	calculateBaseStatValue();
	// Only permit loading the same save 3 times before getting kicked out of the dungeon.
	let loads = +localStorage.loads;
	let loadFloor = +localStorage.loadFloor;
	if (loadFloor == currentLevel){
		localStorage.loads = loads + 1;
		if (loads >= 300){
			currentLevel = 0;
			displayHelpMessage("loadRepeatStop");
		}
	} else {
		localStorage.loads = 1;
		localStorage.loadFloor = currentLevel;
	}
	// Do setup
	if (currentLevel > 0){
		partyUnits = playerUnits.filter(unit => unit.active);
		partyUnits.forEach((unit, i) => {
			unit.character = playerSymbols[(i+1) % 4];
		})
		displayCurrentUnit();
		loadNextMap();
		tickInterval = setInterval(runTick, tickTime);
	}
	displayAllUnits();
}

function openImportExport(){
	document.querySelector("#export-wrapper").style.display = "inline-block";
	document.querySelector("#save-string").value = localStorage.save;
}

function exportGame(){
	document.querySelector("#save-string").value = localStorage.save;
}

function importGame(){
	localStorage.backup = localStorage.save;
	let importSave = document.querySelector("#save-string").value;
	localStorage.save = importSave;
	try {
		load();
	} catch (error) {
		localStorage.save = localStorage.backup;
		load();
		alert("Import failed!");
	}
}

function hardResetGame(){
	localStorage.hardresetbackup = localStorage.save;
	delete(localStorage.save);
	location.reload();
}

load();
