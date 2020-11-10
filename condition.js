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
		return this.value > unit.stats.Health.current / 50;
	}

	cleanse(){
		this.value *= 0.75;
	}
}