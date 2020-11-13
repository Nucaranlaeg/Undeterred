class AutobuyerUnit extends Unit {
	constructor(index) {
		super(true, "Autobuyer", {}, "Simple");
		this.xp = Infinity;
		this.capBreakers = Infinity;
		this.capBreakersUsed = 0;
		this.stats.Health.value = 50;
		this.stats.Damage.value = 5;
		this.isAutobuyer = true;
		this.role = index;
	}

	unspendXp(stat){
		this.stats[stat].gainXp(-settings.multiXp);
		if (this.stats[stat].value < baseStats[stat]) {
			this.stats[stat].value = baseStats[stat];
		}
		this.display();
		this.updateXP();
	}

	breakCap(stat, event){
		this.capBreakersUsed += this.stats[stat].breaks + 1;
		super.breakCap(stat, event);
	}

	unBreakCap(stat, event){
		if (super.unBreakCap(stat, event)){
			this.capBreakersUsed -= this.stats[stat].breaks + 1;
			this.displayStatus();
		}
	}

	display(){
		super.display();
		let unitEl = document.querySelector("#unit");
		Object.values(this.stats).forEach(stat => {
			if (stat.locked) return;
			let statEl = unitEl.querySelector(`.${stat.getQualifiedName()}`);
			statEl.oncontextmenu = e => {
				this.unspendXp(stat.getQualifiedName());
				e.preventDefault();
			};
		});
		document.querySelector("#conditions").innerHTML = "";
	}

	displayStatus(){
		let unitElWrapper = document.querySelector("#unit-wrapper");
		unitElWrapper.querySelector(".xp-amount").innerHTML = this.getSpentStatValue();
		unitElWrapper.querySelector(".cap-breakers").innerHTML = this.capBreakersUsed;
		unitElWrapper.querySelector(".ai").value = this.ai.name;
		unitElWrapper.querySelector(".ai").removeAttribute("disabled");
		document.querySelector("#unit-wrapper .unit-name").innerHTML = `${this.name} (${settings.autobuyer ? "Active" : "Inactive"})`;
		maps[currentLevel].noHighlight();
		unitElWrapper.querySelector("#offline-xp-button").style.display = "none";
		unitElWrapper.querySelector(".role-wrapper").style.display = unlockedRoles ? "block" : "none";
	}

	unlock(stat){
		this.stats[stat].locked = false;
	}

	changeRole(event){
		viewedAutobuyerUnit = event.target.value;
		autobuyerUnits[viewedAutobuyerUnit].display();
		selectedUnit = autobuyerUnits[viewedAutobuyerUnit];
	}
}

function clearAutobuy(){
	autobuyerUnits.forEach(autobuyer => {
		for (let [key, value] of Object.entries(baseStats)){
			if (!autobuyer.stats[key]) continue; // What?  But this way is safer.
			if (key == "CriticalDamage" && value < 2) value = 2;
			autobuyer.stats[key].value = value;
		}
	});
}

function configureAutobuyer(){
	autobuyerUnits[viewedAutobuyerUnit].display();
	selectedUnit = autobuyerUnits[viewedAutobuyerUnit];
}