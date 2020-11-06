class AutobuyerUnit extends Unit {
	constructor() {
		super(true, "Autobuyer", {}, "Simple");
		this.xp = Infinity;
		this.capBreakers = Infinity;
		this.capBreakersUsed = 0;
		this.stats.Health.value = 50;
		this.stats.Damage.value = 5;
		this.isAutobuyer = true;
	}

	unspendXp(stat){
		this.stats[stat].gainXp(-settings.multiXp);
		if (this.stats[stat].value < baseStats[stat]) {
			this.stats[stat].value = baseStats[stat];
		}
		this.display(false);
		this.updateXP();
	}

	breakCap(stat, isCurrent, event){
		this.capBreakersUsed += this.stats[stat].breaks + 1;
		super.breakCap(stat, isCurrent, event);
	}

	unBreakCap(stat, isCurrent, event){
		if (super.unBreakCap(stat, isCurrent, event)){
			this.capBreakersUsed -= this.stats[stat].breaks + 1;
			this.displayStatus();
		}
	}

	display(){
		super.display();
		let unitEl = document.querySelector("#other-unit");
		Object.values(this.stats).forEach(stat => {
			if (stat.locked) return;
			let statEl = unitEl.querySelector(`.${stat.getQualifiedName()}`);
			statEl.oncontextmenu = e => {
				this.unspendXp(stat.getQualifiedName());
				e.preventDefault();
			};
		});
	}

	displayStatus(){
		let unitElWrapper = document.querySelector("#other-unit-wrapper");
		unitElWrapper.querySelector(".xp-amount").innerHTML = this.getSpentStatValue();
		unitElWrapper.querySelector(".cap-breakers").innerHTML = this.capBreakersUsed;
		unitElWrapper.querySelector(".ai").value = this.ai.name;
		unitElWrapper.querySelector(".ai").removeAttribute("disabled");
		document.querySelector("#other-unit-wrapper .col-header").innerHTML = `${this.name} (${settings.autobuyer ? "Active" : "Inactive"})`;
		maps[currentLevel].noHighlight(0);
		unitElWrapper.querySelector("#offline-xp-button").style.display = "none";
		unitElWrapper.querySelector(".role-wrapper").style.display = (this.name == "You" || this.isAutobuyer) && unlockedRoles ? "block" : "none";
	}

	unlock(stat){
		this.stats[stat].locked = false;
	}

	changeRole(event){
		viewedAutobuyerUnit = event.target.value;
		autobuyerUnits[viewedAutobuyerUnit].display();
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
	autobuyerUnits[0].display();
}