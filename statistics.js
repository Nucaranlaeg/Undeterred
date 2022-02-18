const statisticTemplate = document.querySelector("#statistic-template");

class Statistic {
	constructor(name, description, isPlayer, decimals = 0, compareStat = null){
		this.name = name;
		this.description = description;
		this.isPlayer = isPlayer;
		this.decimals = decimals;
		if (compareStat){
			setTimeout(() => this.compareStat = statistics.find(s => s.name == compareStat && s.isPlayer == isPlayer));
		}
		this.levelValue = 0;
		this.value = 0;
		this.node = null;
		this.isVisible = false;
		setTimeout(this.draw.bind(this));
	}

	reset(){
		this.levelValue = 0;
		this.value = 0;
		this.update();
	}

	levelReset(){
		this.levelValue = 0;
		this.update();
	}

	update(amount = 0){
		this.value += amount;
		this.levelValue += amount;
		if (!this.node) return this.draw();
		this.node.querySelector(".value").innerHTML = formatNumber(settings.statistics ? this.levelValue : this.value, this.decimals);
		if (this.compareStat){
			this.node.querySelector(".second-value").innerHTML = settings.statistics ? `(${formatNumber(100 * this.levelValue / this.compareStat.levelValue || 0, 0)}%)` : `(${formatNumber(100 * this.value / this.compareStat.value || 0, 0)}%)`;
		}
		if (!this.isVisible && this.value !== 0){
			this.node.style.display = "block";
			this.isVisible = true;
		}
	}

	draw(){
		if (this.node) return;
		this.node = statisticTemplate.cloneNode(true);
		this.node.removeAttribute("id");
		this.node.querySelector(".name").innerHTML = this.name;
		this.node.querySelector(".description").innerHTML = this.description;
		document.querySelector(`#${this.isPlayer ? "you" : "enemy"}-statistics-wrapper`).appendChild(this.node);
		this.update();
	}
}

function updateStatistic(name, isPlayer, amount){
	const statistic = statistics.find(s => s.name == name && s.isPlayer == isPlayer);
	statistic.update(amount);
}

function resetStatistics(level = false){
	statistics.forEach(s => level ? s.levelReset() : s.reset());
}

function updateAll(){
	statistics.forEach(s => s.update(0));
}

const statistics = [
	new Statistic("Attacks", "The number of times you've swung at an enemy.", false),
	new Statistic("Attacks", "The number of times you've been swung at by an enemy.", true),
	new Statistic("Hits", "The number of times you've hit an enemy.", false, 0, "Attacks"),
	new Statistic("Hits", "The number of times you've been hit by an enemy.", true, 0, "Attacks"),
	new Statistic("Damage", "The amount of damage you've dealt.", false),
	new Statistic("Damage", "The amount of damage you've taken.", true),
	new Statistic("Criticals", "The number of critical hits you've scored.", false),
	new Statistic("Criticals", "The number of critical hits which have been scored on you.", true),
	new Statistic("Regen", "The amount of health you've regenerated.", false),
	new Statistic("Regen", "The amount of health your enemies have regenerated.", true),
];
