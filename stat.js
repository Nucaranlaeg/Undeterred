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
	}

	unlock(){
		this.locked = false;
	}

	onAttack(){}

	onHit(){}

	onDamage(){}

	onTakeDamage(){}

	onKill(){}

	gainXp(amount){
		if (activeChallenge && activeChallenge.isIllegal(this)) return amount;
		this.value += amount * this.xpMult;
		if (this.value > this.cap){
			let extra = (this.value - this.cap) / this.xpMult;
			this.value = this.cap;
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
		let currentValue = this.value;
		while (currentValue > 0){
			if (Math.random() < Math.min(currentValue, 0.75)){
				attackStats.attacks++;
			}
			currentValue -= 0.75;
		}
	}
}

class ToHit extends Stat {
	constructor(value = 0){
		super("To-Hit", value, 1, false, 0, "Increases your chance to hit by roughly 4% per point (decreasing as it gets higher), based on the target's Dodge.");
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
		super("Dodge", value, 1, false, 0, "Decreases your enemy's chance to hit by roughly 4% per point (decreasing as it gets higher), based on the attackers To Hit.");
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
		super("Critical Hit", value, 0.0075, true, 100, "Increases your chance to score a critical hit.  Max chance 75%.  Once past 75%, provides a chance to score a critical hit a third (fourth, etc.) time.  Multiple critical hits multiply each other.");
	}

	onHit(attackStats){
		for (let i = 0; i < attackStats.hits; i++){
			let currentValue = this.value;
			let critCount = 0;
			while (currentValue > 0){
				if (Math.random() < Math.min(currentValue, 0.75)){
					critCount++;
				}
				currentValue -= 0.75;
			}
			attackStats.damage += attackStats.attacker.stats.Damage.value * (attackStats.attacker.stats.CriticalDamage.value ** critCount - 1);
		}
	}
}

class CriticalDamage extends Stat {
	constructor(value = 0){
		super("Critical Damage", value, 0.01, true, 100, "Each time you score a critical hit, it multiplies your damage on that hit by this percent.");
	}
}

class Health extends Stat {
	constructor(value = 0){
		super("Health", value, 10, false, 0, "Increases the amount of damage you can take before you die.");
		this.current = this.value;
	}
	
	gainXp(amount){
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
		super("Block", value, 0.3, false, 0, "Reduces the damage you take by 1 per point.");
	}

	onTakeDamage(attackStats){
		attackStats.damage -= this.value * attackStats.hits;
		if (attackStats.damage < 0) attackStats.damage = 0;
	}
}

class Protection extends Stat {
	constructor(value = 0){
		super("Protection", value, 1, false, 0, "Reduces the damage you take by roughly 1% per point (after Block).");
	}

	onTakeDamage(attackStats){
		attackStats.damage *= 100 / (this.value + 100);
	}
}

class Regeneration extends Stat {
	constructor(value = 0){
		super("Regeneration", value, 0.05, false, 0, "Each second, regain this much health.");
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

class XPBonus extends Stat {
	constructor(value = 0){
		super("XP Bonus", value, 0.005, true, 0, "Gain this percent additional XP.");
	}

	onKill(killStats){
		killStats.xp *= 1 + value;
	}
}

class Range extends Stat {
	constructor(value = 1){
		super("Range", value, 1, false, 1, "Attack units up to this far away.");
	}
}

class Haste extends Stat {
	constructor(value = 0){
		super("Haste", value, 0.0025, true, 100, "Increases your chance to act a second time in a row.  Max chance 75%.  Once past 75%, provides a chance to act a third (fourth, etc.) time.");
	}

	getTicks(){
		let ticks = 0;
		let currentValue = this.value;
		while (currentValue > 0){
			if (Math.random() < Math.min(currentValue, 0.75)){
				ticks++;
			}
			currentValue -= 0.75;
		}
		return ticks;
	}
}
