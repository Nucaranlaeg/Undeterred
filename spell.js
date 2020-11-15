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
		super("Heal", "Restores 10% health to the lowest-health ally below 75% max health.", 50);
	}

	onCast(caster){
		allies = [];
		if (caster.playerOwned){
			allies = playerUnits.filter(unit => unit.active && unit.stats.Health.current > 0 && unit.stats.Health.current < unit.stats.Health.value * 0.75);
		} else {
			allies = maps[currentLevel].enemies.filter(unit => unit.stats.Health.current > 0 && unit.stats.Health.current < unit.stats.Health.value * 0.75);
		}
		if (!allies.length) return false;
		minHPAlly = allies.sort((a, b) => a.stats.Health.current - b.stats.Health.current);
		minHPAlly.stats.Health.heal(minHPAlly.stats.Health.value / 10);
		return true;
	}
}

class Cleanse extends Spell {
	constructor(){
		super("Cleanse", "Reduces the effect of all conditions by 10% on the a random ally with high enough conditions (thresholds are condition-specific).", 100);
	}

	onCast(caster){
		allies = [];
		if (caster.playerOwned){
			allies = playerUnits.filter(unit => unit.active && unit.conditions.some(condition => condition.isOverCleanseThreshold(unit)));
		} else {
			allies = maps[currentLevel].enemies.filter(unit => unit.conditions.some(condition => condition.isOverCleanseThreshold(unit)));
		}
		if (!allies.length) return false;
		let target = Math.floor(Math.random() * allies.length);
		allies[target].conditions.forEach(condition => condition.cleanse());
		return true;
	}
}

class Summon extends Spell {
	constructor(creature, level, cost){
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