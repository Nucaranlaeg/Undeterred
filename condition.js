class Condition {
	constructor(name, description, type = 0){
		this.name = name;
		this.description = description;
		this.type = ["negative", "positive"][type];
		this.value = 0;
		this.isApplied = false;
	}

	increase(amount){
		this.value += amount;
		this.isApplied = true;
	}

	decrease(amount){
		this.value = Math.max(amount, 0);
	}

	reset(){
		this.value = 0;
		this.isApplied = false;
	}

	onTick(){}

	isOverCleanseThreshold(){}

	cleanse(){}

	getQualifiedName(){
		return this.name.replace(/[- ]/g, "");
	}
}

class Bleeding extends Condition {
	constructor(){
		super("Bleeding", "This unit is losing health every tick.");
	}

	onTick(unit){
		unit.stats.Health.takeDamage({enemy: unit, damage: this.value});
	}

	isOverCleanseThreshold(unit){
		return this.value > unit.stats.Health.current / 100;
	}

	cleanse(){
		this.value *= 0.75;
	}
}

class Slowed extends Condition {
	constructor(){
		super("Slowed", "This unit gains a 1% chance per point (multiplicative) to miss its turn.  Slowly dissipates.");
	}

	missTurn(){
		if (Math.random() > (0.99 ** this.value)){
			this.value *= 0.95;
			this.value = Math.floor(this.value * 100) / 100;
			return true;
		}
		return false;
	}

	isOverCleanseThreshold(unit){
		return this.value > 50 * (2 ** (unit.stats.Haste.value + 1));
	}

	cleanse(){
		this.value *= 0.25;
		this.value = Math.floor(this.value * 100) / 100;
	}
}
