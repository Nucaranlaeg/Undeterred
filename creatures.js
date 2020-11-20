let creatures = {
	"a": {
		name: "Giant Ant Worker",
		description: "You've seen ants before.  But this is the size of a small dog!",
		Health: 20,
		Damage: 2.2,
		ToHit: 1,
		Dodge: 1,
		xp: 1,
		base_level: 2,
		viewLevel: 1,
	},
	"r": {
		name: "Giant Ant Warrior",
		description: "The Workers were the size of a small dog.  These are the size of a large dog.  No, larger than that.",
		Health: 30,
		Damage: 6,
		ToHit: 2,
		Dodge: 2,
		Protection: 3,
		xp: 2,
		base_level: 0,
		viewLevel: 4,
	},
	"q": {
		name: "Giant Ant Queen",
		description: "This thing is massive!  Its carapace menaces with spikes of chitin!",
		Health: 600,
		Damage: 50,
		ToHit: 50,
		Dodge: 50,
		Protection: 50,
		CriticalHit: 0.5,
		CriticalDamage: 3,
		xp: 10,
		base_level: -8,
		viewLevel: 10,
	},
	"g": {
		name: "Goblin",
		description: "Ugly, mean, cruel - are there any negative descriptors that don't apply to goblins?",
		Health: 80,
		Damage: 12,
		ToHit: 10,
		Dodge: 6,
		CriticalHit: 0.05,
		xp: 3,
		ai: "Nearest",
		base_level: -6,
		viewLevel: 11,
	},
	"w": {
		name: "Warg",
		description: "Not the friendliest of animals.  It's fast and vicious.",
		Health: 40,
		Damage: 18,
		ToHit: 5,
		Dodge: 20,
		Protection: 8,
		Haste: 0.1,
		xp: 2,
		ai: "Nearest",
		base_level: -9,
		viewLevel: 13,
	},
	"A": {
		name: "Goblin Archer",
		description: "Potentially the smartest goblin you're ever seen!  Not very good with a bow, but it's clearly superior to walking up to you and dying.",
		Health: 20,
		Damage: 20,
		ToHit: 15,
		Dodge: 6,
		Range: 3,
		xp: 5,
		ai: "Nearest",
		base_level: -15,
		viewLevel: 17,
	},
	"h": {
		name: "Hobgoblin",
		description: "The big cheese.  The head honcho.  Whatever you call him, he's in charge.  But it's not because of his good looks.",
		Health: 3000,
		Damage: 500,
		ToHit: 300,
		Dodge: 200,
		CriticalHit: 0.5,
		CriticalDamage: 3,
		xp: 10,
		ai: "Nearest",
		base_level: -18,
		viewLevel: 20,
	},
	"G": {
		name: "Golem",
		description: "It's made of some kind of metal or stone or wood - it's hard.  You wish you brought something other than just your bare hands.",
		Health: 970,
		Damage: 30,
		ToHit: 50,
		Dodge: 10,
		Protection: 40,
		Regeneration: 1,
		Block: 30,
		xp: 6,
		ai: "Simple",
		base_level: -16,
		level_softcap: 8,
		viewLevel: 21,
	},
	"z": {
		name: "Zombie",
		description: "It's dead, but somehow its festering wounds transfer to you as it hits you.  It feels kind of painful.",
		Health: 600,
		Damage: 40,
		ToHit: 40,
		Dodge: 5,
		Protection: 20,
		Bleed: 0.1,
		xp: 1,
		ai: "Simple",
		base_level: -19,
		viewLevel: 24,
	},
	"R": {
		name: "Revenant",
		description: "Another undead creature, this one capable of recovering from horrific wounds in moments.",
		Health: 10000,
		Damage: 90,
		ToHit: 100,
		Dodge: 25,
		Regeneration: 80,
		xp: 20,
		ai: "Coward",
		base_level: -20,
		viewLevel: 26,
	},
	"n": {
		name: "Necromancer",
		description: "Likely the source of the undead, this mysterious figure is capable of summoning a stream of zombies.",
		Health: 50000,
		Damage: 1000,
		ToHit: 50,
		Dodge: 50,
		Mana: 20,
		ManaRegeneration: 5,
		xp: 60,
		spell: new Summon("z", 10, 20),
		ai: "Summoner",
		base_level: -28,
		viewLevel: 30,
	},
}

displayedCreature = null;

function showAllCreatureHelp(){
	helpClear();
	let selector = document.querySelector("#help-selector");
	for (const [key, value] of Object.entries(creatures)){
		let creatureSelect = document.createElement("div");
		if (bestLevel + 1 < value.viewLevel) continue;
		creatureSelect.classList.add("help-item");
		creatureSelect.innerHTML = value.name;
		creatureSelect.onclick = displayCreatureHelp.bind(null, value, creatureSelect);
		selector.appendChild(creatureSelect);
	}
}

function displayCreatureHelp(creature, el){
	let displayLevel = document.querySelector("#help-level");
	if (el) {
		displayedCreature = creature;
		document.querySelectorAll(".help-item.active").forEach(el => el.classList.remove("active"));
		el.classList.add("active");
		document.querySelector("#help-level-wrapper").style.display = "block";
		document.querySelector("#help-description").innerHTML = displayedCreature.description;
		document.querySelector("#help-compare").style.display = "inline-block";
	}
	displayLevel.value = Math.max(displayLevel.value, displayedCreature.viewLevel)
	let effectiveLevel = Math.min((displayedCreature.base_level + +displayLevel.value), (displayedCreature.base_level + +displayLevel.value + (displayedCreature.level_softcap || Infinity)) / 2)
	let statsEl = document.querySelector("#help-stats");
	while (statsEl.firstChild){
		statsEl.removeChild(statsEl.lastChild);
	}
	let tempUnit = new Unit(false, "", {});
	for (const [key, value] of Object.entries(displayedCreature)){
		let statEl = document.querySelector("#help-stat-template");
		// Check that it is a stat.
		if (tempUnit.stats[key] !== undefined){
			let creatureEl = statEl.cloneNode(true);
			creatureEl.removeAttribute("id");
			creatureEl.querySelector(".help-name").innerHTML = tempUnit.stats[key].name;
			creatureEl.querySelector(".help-value").innerHTML = formatNumber(value * (tempUnit.stats[key].isPercent ? 100 : 1) * effectiveLevel);
			statsEl.appendChild(creatureEl);
		} else if (key == "ai"){
			let creatureEl = statEl.cloneNode(true);
			creatureEl.removeAttribute("id");
			creatureEl.querySelector(".help-name").innerHTML = "AI";
			creatureEl.querySelector(".help-value").innerHTML = value;
			statsEl.appendChild(creatureEl);
		}
	}
	let nextUnit = 2;
	[...playerUnits, ...autobuyerUnits].forEach(unit => {
		if (!unit.active || (unit.isAutobuyer && unit.role > 0 && !unlockedRoles)) return;
		if (unit.isAutobuyer && nextUnit < 5) nextUnit = 5;
		document.querySelector(`#compare-name td:nth-of-type(${nextUnit})`).innerHTML = unit.isAutobuyer ? unit.role + 1 : "#" + unit.loopNumber;
		let hitChance = (unit.stats.ToHit.value + 25) / (displayedCreature.Dodge * effectiveLevel + unit.stats.ToHit.value + 50);
		document.querySelector(`#compare-hit-chance td:nth-of-type(${nextUnit})`).innerHTML = formatNumber(hitChance * 100) + "%";
		function getAvgDamage(){
			let damage = hitChance * unit.stats.Damage.value;
			let maxCrits = Math.ceil(unit.stats.CriticalHit.value / 0.75);
			let damageByNumCrits = [];
			for (let i = 0; i <= maxCrits; i++){
				let critDamage = damage * (unit.stats.CriticalDamage.value ** i);
				critDamage *= 100 / ((displayedCreature.Protection || 0) + 100);
				critDamage = Math.max(0, critDamage - (displayedCreature.Block || 0));
				damageByNumCrits[i] = critDamage;
			}
			let chance = 1;
			let totalDamage = 0;
			let currentCritChance = unit.stats.CriticalHit.value;
			let i = 0;
			while (currentCritChance > 0){
				let hitChance = Math.min(unit.stats.CriticalHit.value, 0.75);
				totalDamage += damageByNumCrits[i] * chance * (1 - hitChance);
				chance *= hitChance;
				currentCritChance -= 0.75;
				i++;
			}
			return totalDamage;
		}
		document.querySelector(`#compare-average-dps td:nth-of-type(${nextUnit})`).innerHTML = formatNumber(getAvgDamage());
		nextUnit++;
	});
}
