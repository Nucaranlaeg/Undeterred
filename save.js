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
		units: playerUnits.map(unit => {
			return {
				stats: Object.values(unit.stats).filter(stat => !stat.locked).map(stat => {
					return {
						name: stat.getQualifiedName(),
						cap: stat.cap,
						value: stat.value,
					};
				}),
				loopNumber: unit.loopNumber,
				capBreakers: unit.capBreakers,
				active: unit.active,
				current: unit.current,
				xp: unit.xp,
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
				};
			}),
			capBreakersUsed: autobuyerUnit.capBreakersUsed,
		},
		activeChallenge: activeChallenge ? activeChallenge.name.replace(/ /g, "") : "",
		challenges: Object.entries(challenges).map(challenge => {
			return {
				name: challenge[0],
				locked: challenge[1].locked,
				bestFloor: challenge[1].bestFloor,
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
	if (!maps[currentLevel]) currentLevel = 0;
	playerUnits = saveGame.units.map(unitData => {
		let unit = new Unit(true, "You", {}, unitData.ai, false, unitData.loopNumber);
		unitData.stats.forEach(stat => {
			unit.stats[stat.name].cap = stat.cap || Infinity;
			unit.stats[stat.name].value = stat.value;
			unit.stats[stat.name].locked = false;
		});
		unit.capBreakers = unitData.capBreakers;
		unit.active = unitData.active;
		unit.current = unitData.current;
		unit.xp = unitData.xp;
		unit.preventRemoval = unitData.preventRemoval;
		return unit;
	});
	saveGame.autobuy.stats.forEach(stat => {
		autobuyerUnit.stats[stat.name].cap = stat.cap || Infinity;
		autobuyerUnit.stats[stat.name].value = stat.value;
		autobuyerUnit.stats[stat.name].locked = false;
	});
	autobuyerUnit.capBreakersUsed = saveGame.autobuy.capBreakersUsed;
	activeChallenge = challenges[saveGame.activeChallenge] || null;
	saveGame.challenges.forEach(challengeData => {
		let challenge = challenges[challengeData.name];
		challenge.locked = challengeData.locked;
		challenge.bestFloor = challengeData.bestFloor;
	});

	// Do setup
	if (currentLevel > 0){
		calculateBaseStatValue();
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
	alert("Incomplete!");
}

function importGame(){
	alert("Incomplete!");
}

load();
