class Spell {
	constructor(name, description, cost){
		this.name = name;
		this.description = description;
		this.cost = cost;
	}

	tryCast(caster){
		if (this.cost > caster.stats.Mana.current) return false;
		if (this.onCast(caster)){
			caster.stats.Mana.current -= this.cost;
			return true;
		}
		return false;
	}

	onCast(){}
}

class Heal extends Spell {
	constructor(){
		super("Heal", "Restores 10% max health to the lowest-health ally below 75% max health.", 50);
	}

	onCast(caster){
		let allies = [];
		if (caster.playerOwned){
			allies = playerUnits.filter(unit => unit.active && unit.stats.Health.current > 0 && unit.stats.Health.current < unit.stats.Health.value * 0.75);
		} else {
			allies = maps[currentLevel].enemies.filter(unit => unit.stats.Health.current > 0 && unit.stats.Health.current < unit.stats.Health.value * 0.75);
		}
		if (!allies.length) return false;
		let minHPAlly = allies.sort((a, b) => a.stats.Health.current - b.stats.Health.current)[0];
		minHPAlly.stats.Health.heal(minHPAlly.stats.Health.value / 10);
		return true;
	}
}

class Cleanse extends Spell {
	constructor(){
		super("Cleanse", "Reduces the effect of all conditions by 10% on the a random ally with high enough conditions (thresholds are condition-specific).", 100);
	}

	onCast(caster){
		let allies = [];
		if (caster.playerOwned){
			allies = playerUnits.filter(unit => unit.active && Object.values(unit.conditions).some(condition => condition.isOverCleanseThreshold(unit)));
		} else {
			allies = maps[currentLevel].enemies.filter(unit => Object.values(unit.conditions).some(condition => condition.isOverCleanseThreshold(unit)));
		}
		if (!allies.length) return false;
		let target = Math.floor(Math.random() * allies.length);
		Object.values(allies[target].conditions).forEach(condition => condition.cleanse());
		return true;
	}
}

class Summon extends Spell {
	constructor(creature, level, cost = "Variable"){
		// cost is not optional here.
		super("Summon", "Creates a creature.", cost);
		this.creature = creature;
		this.level = level;
	}

	onCast(caster){
		let possibleSummonLocations = [
			[caster.x + 1, caster.y],
			[caster.x, caster.y + 1],
			[caster.x - 1, caster.y],
			[caster.x, caster.y - 1],
		];
		shuffle(possibleSummonLocations);
		for (let i = 0; i < possibleSummonLocations.length; i++){
			if (maps[currentLevel].isEmpty(possibleSummonLocations[i][0], possibleSummonLocations[i][1])){
				let newSummon = maps[currentLevel].summon(possibleSummonLocations[i][0], possibleSummonLocations[i][1], this.creature, this.level);
				newSummon.ai = ais.Nearest;
				return true;
			}
		}
		return false;
	}
}

class Zap extends Spell {
	constructor(){
		super("Zap", "Attack any creature you can see.", 25);
	}

	onCast(caster){
		let targets = [];
		if (caster.playerOwned){
			targets = maps[currentLevel].getVisibleEnemies().filter(unit => maps[currentLevel].isClearLine([caster.x, caster.y], [unit.x, unit.y]));
		} else {
			targets = playerUnits.filter(unit => unit.active && !unit.dead && maps[currentLevel].isClearLine([caster.x, caster.y], [unit.x, unit.y]));
		}
		if (!targets.length) return false;
		let target = Math.floor(Math.random() * targets.length);
		caster.attack(target, true);
		return true;
	}
}

lockedSpells = {
	Heal: true,
	Cleanse: true,
	Summon: true,
}

spells = {
	Heal: Heal,
	Cleanse: Cleanse,
	Summon: Summon,
}

function fillSpellDropdown(){
	let selectEls = document.querySelectorAll(".spell");
	selectEls.forEach(el => {
		while (el.firstChild){
			el.removeChild(el.lastChild);
		}
	});
	for (const spell of Object.values(spells)){
		let spellObj = new spell();
		let spellEl = document.createElement("option");
		spellEl.value = spellObj.name;
		spellEl.innerHTML = `${spellObj.name} (${spellObj.cost})`;
		if (lockedSpells[spellObj.name]){
			spellEl.disabled = true;
		} else {
			spellEl.title = spellObj.description;
		}
		selectEls.forEach(el => {
			el.append(spellEl.cloneNode(true));
		});
	}
}

fillSpellDropdown();

function displaySpellHelp(spell, el){
	document.querySelectorAll(".help-item.active").forEach(el => el.classList.remove("active"));
	el.target.classList.add("active");
	document.querySelector("#help-description").innerHTML = (new spells[spell]()).description;
}

function showAllSpellHelp(){
	helpClear();
	let selector = document.querySelector("#help-selector");
	for (const [spell, locked] of Object.entries(lockedSpells)){
		let spellSelect = document.createElement("div");
		if (locked) continue;
		spellSelect.classList.add("help-item");
		spellSelect.innerHTML = spell;
		spellSelect.onclick = displaySpellHelp.bind(null, spell);
		selector.appendChild(spellSelect);
	}
}
