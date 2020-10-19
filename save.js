function save(){
	let saveGame = {
		settings,
		lockedSettings,
		saveTime: Date.now() - fastTime * 1000,
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
			};
		}),
		autobuy: {
			stats: Object.values(autobuyerUnit.stats).filter(stat => !stat.locked).map(stat => {
				return {
					name: stat.getQualifiedName(),
					cap: stat.cap,
					value: stat.value,
					breaks: stat.breaks,
				};
			}),
			capBreakersUsed: autobuyerUnit.capBreakersUsed,
			ai: autobuyerUnit.ai.name,
		},
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
	if (localStorage.save === undefined) return;
	let saveGame = JSON.parse(atob(localStorage.save));
	for (const [key, value] of Object.entries(saveGame.settings)){
		settings[key] = value;
	}
	for (const [key, value] of Object.entries(saveGame.lockedSettings)){
		lockedSettings[key] = value;
	}
	fastTime = Date.now() - saveGame.saveTime;
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
		let unit = new Unit(true, "You", {}, unitData.ai, false, unitData.loopNumber);
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
		return unit;
	});
	// Load autobuyer
	// Should potentially use same system as loading units.
	saveGame.autobuy.stats.forEach(stat => {
		autobuyerUnit.stats[stat.name].cap = stat.cap || Infinity;
		autobuyerUnit.stats[stat.name].value = stat.value;
		autobuyerUnit.stats[stat.name].locked = false;
		autobuyerUnit.stats[stat.name].breaks = stat.breaks;
	});
	autobuyerUnit.capBreakersUsed = saveGame.autobuy.capBreakersUsed;
	autobuyerUnit.ai = ais[saveGame.autobuy.ai];

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

function exportGame(){
}

function importGame(){
	localStorage.backup = localStorage.save;
	let importSave = "";
	localStorage.save = importSave;
	try {
		load();
	} catch (error) {
		localStorage.save = localStorage.backup;
		load();
		alert("Import failed!");
	}
}

load();
