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
		playerPosIndex,
		units: playerUnits.map(unit => {
			return {
				stats: Object.values(unit.stats).filter(stat => !stat.locked).map(stat => {
					return {
						name: stat.getQualifiedName(),
						cap: stat.cap,
						value: stat.value,
						breaks: stat.breaks,
						current: stat.current,
					};
				}),
				conditions: Object.values(unit.conditions).map(condition => {
					return {
						name: condition.getQualifiedName(),
						value: condition.value,
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
				spell: unit.spell ? unit.spell.name : "",
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
				spell: autobuyer.spell ? autobuyer.spell.name : "",
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
		lockedSpells: Object.entries(lockedSpells).filter(s => !s[1]).map(s => s[0]),
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
	playerPosIndex = saveGame.playerPosIndex || [1,2,3,0];
	offlineData = saveGame.offlineData;
	offlineData.offlineTime += Date.now() - offlineData.lastTickTime - tickTime;
	offlineData.lastTickTime = Date.now();
	offlineTimeEl.innerHTML = formatNumber(offlineData.offlineTime / 1000);
	document.querySelector("#xp-per-sec").innerHTML = formatNumber(offlineData.xpPerSec);
	if (!maps[currentLevel]) currentLevel = 0;
	activeChallenge = challenges[saveGame.activeChallenge] || null;
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
		unit.spell = unitData.spell ? new spells[unitData.spell]() : null;
		if (activeChallenge && activeChallenge.name == "Restless") {
			unit.stats.Health.current = unitData.stats.find(s => s.name == "Health").current;
			unitData.conditions.forEach(condition => {
				unit.conditions[condition.name].value = condition.value;
			});
		}
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
		autobuyerUnits[index].spell = autobuyer.spell ? new spells[autobuyer.spell]() : null;
	});
	unlockedRoles = saveGame.unlockedRoles;

	Object.values(challenges).forEach(challenge => {
		challenge.locked = true;
		challenge.bestFloor = 0;
	});

	saveGame.challenges.forEach(challengeData => {
		let challenge = challenges[challengeData.name];
		if (!challenge) return;
		challenge.locked = challengeData.locked;
		challenge.bestFloor = challengeData.bestFloor;
	});
	saveGame.ais.forEach(saveAi => {
		ais[saveAi.name].locked = saveAi.locked;
	});
	fillAIDropdown();

	saveGame.lockedSpells.forEach(spell => {
		lockedSpells[spell] = false;
	});
	fillSpellDropdown();
	for (let i = 0; i < maps.length && i < saveGame.maps.length; i++){
		maps[i].deaths = saveGame.maps[i].deaths;
		maps[i].conquered = saveGame.maps[i].conquered;
	}
	
	displaySettings();
	calculateBaseStatValue();
	// Only permit loading the same save 3 times before getting kicked out of the dungeon.
	let loads = +localStorage.loads;
	let loadFloor = +localStorage.loadFloor;
	if (loadFloor == currentLevel){
		localStorage.loads = loads + 1;
		if (loads >= 3000 && localStorage.debug !== "testing"){
			currentLevel = 0;
			displayHelpMessage("Max Loads");
		}
	} else {
		localStorage.loads = 1;
		localStorage.loadFloor = currentLevel;
	}
	// Do setup
	if (currentLevel > 0){
		loadNextMap();
		tickInterval = setInterval(runTick, tickTime);
	}
	displayChallenges();
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
