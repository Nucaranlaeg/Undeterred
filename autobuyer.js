console.log("Loading autobuyer.js")

class AutoBuyerUnit extends Unit {
	constructor() {
		super(false, "Autobuyer Settings", baseStats, "");
		this.xp = Infinity;
		this.capBreakers = Infinity;
	}

	displayStatus(){
		let unitElWrapper = document.querySelector("#other-unit-wrapper");
		unitElWrapper.querySelector(".xp-amount").innerHTML = this.getSpentStatValue();
		unitElWrapper.querySelector(".cap-breakers").innerHTML = this.capBreakers;
		unitElWrapper.querySelector(".ai").innerHTML = "";
	}
}