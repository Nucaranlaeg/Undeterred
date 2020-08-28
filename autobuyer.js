class AutobuyerUnit extends Unit {
	constructor() {
		super(false, "Autobuyer", {}, "");
		this.xp = Infinity;
		this.capBreakers = Infinity;
		this.capBreakersUsed = 0;
		this.stats.Health.value = 50;
		this.stats.Damage.value = 5;
	}

	unspendXp(stat){
		this.stats[stat].gainXp(-settings.multiXp);
		this.display(false);
		this.updateXP();
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
		autobuyComplete = false;
	}

	displayStatus(){
		let unitElWrapper = document.querySelector("#other-unit-wrapper");
		unitElWrapper.querySelector(".xp-amount").innerHTML = this.getSpentStatValue();
		unitElWrapper.querySelector(".cap-breakers").innerHTML = this.capBreakersUsed;
		unitElWrapper.querySelector(".ai").innerHTML = "";
		document.querySelector("#other-unit-wrapper .col-header").innerHTML = `${this.name} (${settings.autobuyer ? "Active" : "Inactive"})`;
		maps[currentLevel].noHighlight(0);
	}

	unlock(stat){
		this.stats[stat].locked = false;
	}
}

function clearAutobuy(){
	for (const [key, value] of Object.entries(baseStats)){
		if (!autobuyerUnit.stats[key]) continue; // What?  But this way is safer.
		autobuyerUnit.stats[key].value = value;
	}
	autobuyerUnit.display();
}