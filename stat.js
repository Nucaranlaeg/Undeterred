class Stat {
	constructor(name, value, xpMult, isPercent, capMult, description){
		this.name = name;
		this.value = value;
		this.xpMult = xpMult;
		this.isPercent = isPercent;
		this.description = description;
		this.locked = true;
		this.cap = capMult > 0 ? xpMult * capMult + value : Infinity;
		this.capIncrease = capMult > 0 ? xpMult * Math.ceil(capMult / 2) : 0;
		this.breaks = 0;
	}

	unlock(){
		this.locked = false;
	}
	
	addBase(amount){
		this.value += amount;
		this.cap += amount;
	}

	onAttack(){}

	onHit(){}

	onDamage(){}

	onTakeDamage(){}

	onKill(){}

	onTick(){}

	getEffectiveCap(){
		let base = baseStats[this.getQualifiedName()] || 0;
		return (this.cap - base) * (1 + challenges.Respawning.bestFloor / 100) + base;
	}

	gainXp(amount){
		if (activeChallenge && activeChallenge.isIllegal(this)) return amount;
		this.value += amount * this.xpMult;
		if (this.value > this.getEffectiveCap()){
			let extra = (this.value - this.getEffectiveCap()) / this.xpMult;
			this.value = this.getEffectiveCap();
			return extra;
		} else if (this.value < 0){
			let extra = -this.value / this.xpMult;
			this.value = 0;
			return extra;
		}
		return 0;
	}

	getXpAmount(){
		return this.value / this.xpMult;
	}

	increaseCap(){
		if (this.cap == Infinity || this.capIncrease == 0) return false;
		this.cap += this.capIncrease;
		this.breaks++;
		return true;
	}

	decreaseCap(){
		if (this.cap == Infinity || this.capIncrease == 0 || this.breaks == 0) return false;
		this.cap -= this.capIncrease;
		this.breaks--;
		return true;
	}

	getQualifiedName(){
		return this.name.replace(/[- ]/g, "");
	}
}

class Multiattack extends Stat {
	constructor(value = 0){
		super("Multiattack", value, 0.005, true, 100, "The chance you have to attack a second time.  Max chance 75%.  Once past 75%, provides a chance to attack a third (fourth, etc.) time.");
	}

	onBeginAttack(attackStats){
		attackStats.attacks += getOccurrences(this.value);
	}
}

class ToHit extends Stat {
	constructor(value = 0){
		super("To-Hit", value, 1, false, 0, "Increases your chance to hit by roughly 2% per point (decreasing as it gets higher), based on the target's Dodge. ((To-Hit + 25)/(To-Hit + Dodge + 50))");
	}

	onAttack(attackStats){
		let chance = (this.value + 25) / (attackStats.enemy.stats.Dodge.value + this.value + 50);
		for (let i = 0; i < attackStats.attacks; i++){
			if (Math.random() < chance){
				attackStats.hits++;
			}
		}
	}
}

class Dodge extends Stat {
	constructor(value = 0){
		super("Dodge", value, 1, false, 0, "Decreases your enemy's chance to hit by roughly 2% per point (decreasing as it gets higher), based on the attackers To Hit. ((To-Hit + 25)/(To-Hit + Dodge + 50))");
	}
}

class Damage extends Stat {
	constructor(value = 0){
		super("Damage", value, 1, false, 0, "Increases the damage you do by 1 per point.");
	}

	onHit(attackStats){
		attackStats.damage += this.value * attackStats.hits;
	}
}

class CriticalHit extends Stat {
	constructor(value = 0){
		super("Critical Hit", value, 0.0075, true, 100, "Increases your chance to score a critical hit (initially 2x damage).  Max chance 75%.  Once past 75%, provides a chance to score a critical hit a third (fourth, etc.) time.  Multiple critical hits multiply each other.");
	}

	onHit(attackStats){
		for (let i = 0; i < attackStats.hits; i++){
			let critCount = getOccurrences(this.value);
			if (activeChallenge && activeChallenge.name == "Criticality" && !attackStats.attacker.playerOwned){
				critCount++;
			}
			let critMult = attackStats.attacker.stats.CriticalDamage.value ** critCount - 1;
			critMult *= 100 / (100 + attackStats.enemy.stats.Blunting.value);
			attackStats.damage += attackStats.attacker.stats.Damage.value * critMult;
		}
	}
}

class CriticalDamage extends Stat {
	constructor(value = 0){
		super("Critical Damage", value, 0.01, true, 100, "Each time you score a critical hit, it multiplies your damage on that hit by this percent.");
	}
}

class Blunting extends Stat {
	constructor(value = 0){
		super("Blunting", value, 0.01, true, 100, "Reduces the damage from critical hits (as protection, but only for the extra damage).");
	}
}

class Health extends Stat {
	constructor(value = 0){
		super("Health", value, 10, false, 0, "Increases the amount of damage you can take before you die.");
		this.current = this.value;
	}
	
	gainXp(amount){
		if (activeChallenge && activeChallenge.isIllegal(this)) return amount;
		if (this.value == this.cap) return amount;
		this.current += amount * this.xpMult;
		this.value += amount * this.xpMult;
		if (this.value > this.cap){
			let extra = (this.value - this.cap) / this.xpMult;
			this.current = this.current - this.value + this.cap;
			this.value = this.cap;
			return extra;
		}
		return 0;
	}

	takeDamage(attackStats){
		this.current -= attackStats.damage;
		if (this.current <= 0){
			this.current = 0;
			attackStats.enemy.die();
		}
	}

	heal(amount){
		this.current = Math.min(this.value, this.current + amount);
	}
}

class Block extends Stat {
	constructor(value = 0){
		super("Block", value, 0.2, false, 200, "Reduces the damage you take by 1 per point (after Protection).");
	}

	onTakeDamage(attackStats){
		attackStats.damage -= this.value * attackStats.hits;
		if (attackStats.damage < 0) attackStats.damage = 0;
	}
}

class Protection extends Stat {
	constructor(value = 0){
		super("Protection", value, 1, false, 100, "Reduces the damage you take by roughly 1% per point (Damage / (Protection / 100 + 1)).");
	}

	onTakeDamage(attackStats){
		attackStats.damage *= 100 / (this.value + 100);
	}
}

class Regeneration extends Stat {
	constructor(value = 0){
		super("Regeneration", value, 0.1, false, 100, "Each tick, regain this much health.");
	}

	onTick(unit){
		unit.stats.Health.heal(this.value * (1 + (unit.name == "Adventurer" ? 0.1 * challenges.Restless.bestFloor : 0)));
	}
}

class Vampirism extends Stat {
	constructor(value = 0){
		super("Vampirism", value, 0.001, true, 100, "Heal this percent of the damage you do.");
	}

	onDamage(attackStats){
		attackStats.attacker.stats.Health.heal(attackStats.damage * this.value / 100); 
	}
}

class Range extends Stat {
	constructor(value = 1){
		super("Range", value, 0.0025, false, 400, "Attack units up to this far away (requires 400 xp per point).");
		this.capIncrease = 1;
	}
}

class Haste extends Stat {
	constructor(value = 0){
		super("Haste", value, 0.0025, true, 100, "Increases your chance to act a second time in a row.  Max chance 75%.  Once past 75%, provides a chance to act a third (fourth, etc.) time.");
	}

	getTicks(){
		return getOccurrences(this.value);
	}
}

class Bleed extends Stat {
	constructor(value = 1){
		super("Bleed", value, 0.1, false, 100, "Attacks deal this much damage per tick for the rest of the level.");
	}

	onHit(attackStats){
		attackStats.bleed = this.value * attackStats.hits;
	}

	onTakeDamage(attackStats){
		attackStats.enemy.conditions.Bleeding.increase(attackStats.bleed);
	}
}

class Mana extends Stat {
	constructor(value = 0){
		super("Mana", value, 1, false, 100, "Your ability to cast spells.");
		this.current = this.value;
	}

	heal(amount){
		this.current = Math.min(this.value, this.current + amount);
	}
}

class ManaRegeneration extends Stat {
	constructor(value = 0){
		super("Mana Regeneration", value, 0.01, false, 100, "Each tick, regain this much mana.");
	}

	onTick(unit){
		unit.stats.Mana.heal(this.value);
	}
}

function getOccurrences(value){
	let occurances = 0;
	while (value > 0){
		if (Math.random() < Math.min(value, 0.75)){
			occurances++;
		}
		value -= 0.75;
	}
	return occurances;
}