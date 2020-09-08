class Challenge {
	constructor(name, description, reward, rewardDescription, illegalStats){
		this.name = name;
		this.description = description;
		this.reward = reward;
		this.rewardDescription = rewardDescription;
		this.illegalStats = illegalStats;
		this.locked = true;
		this.bestFloor = 0;
	}

	isIllegal(stat){
		return this.illegalStats.includes(stat.name);
	}

	updateReward(){
		while (this.bestFloor <= currentLevel){
			// Should only ever happen once...
			this.reward();
			this.bestFloor++;
		}
	}
}

let activeChallenge = null;

let challenges = {
	LowDamage: new Challenge("Low Damage", "Delve without the ability to increase your damage.", gainBase("Damage", 2), "+2 Damage / floor", ["Damage"]),
	LowHealth: new Challenge("Low Health", "Delve without the ability to increase your health.", gainBase("Health", 25), "+25 Health / floor", ["Health"]),
	PlusTwoLevels: new Challenge("Plus Two Levels", "Delve, but each monster is leveled up twice.", ()=>{}, "+0.5 XP / floor each floor", []),
	Accuracy: new Challenge("Accuracy", "Delve, but all monsters have 10x as much To-Hit.", gainBase("Dodge", 4), "+4 Dodge / floor", []),
	Criticality: new Challenge("Criticality", "Delve, but all attacks crit one additional time.", gainBase("Critical Damage", 0.04), "+4% Critical Damage / floor", []),
};

function gainBase(stat, value){
	return () => {
		baseStats[stat] += value;
		playerUnits.forEach(unit => unit.stats[stat].value += value);
		autobuyerUnit.stats[stat].value = Math.max(autobuyerUnit.stats[stat].value, baseStats[stat]);
		calculateBaseStatValue();
		displayCurrentUnit();
		if (selectedUnit){
			selectedUnit.display();
		}
	};
}

function displayChallenges(){
	if (!settings.showChallenges) return;
	document.querySelector("#challenges-wrapper").style.display = "inline-block";
	let challengeEl = document.querySelector("#challenges");
	while (challengeEl.firstChild){
		challengeEl.removeChild(challengeEl.lastChild);
	}
	let challengeTemplate = document.querySelector("#challenge-template");
	for (let challenge of Object.values(challenges)){
		if (challenge.locked) continue;
		let cEl = challengeTemplate.cloneNode(true);
		cEl.removeAttribute("id");
		cEl.querySelector(".name").innerHTML = challenge.name;
		cEl.querySelector(".description").innerHTML = challenge.description;
		cEl.title = challenge.description;
		cEl.querySelector(".reward").innerHTML = challenge.rewardDescription;
		cEl.querySelector(".highest-floor").innerHTML = "Best: " + challenge.bestFloor;
		if (challenge == activeChallenge){
			cEl.classList.add("running");
		}
		cEl.onclick = challengeConfirm.bind(this, challenge);
		challengeEl.append(cEl);
	}
	document.querySelector("#exit-challenge").style.display = activeChallenge ? "block" : "none";
}

function startChallenge(challenge){
	activeChallenge = challenge;
	if (challenge) playerUnits = [];
	clearAutobuy();
	endRun();
	displayChallenges();
	document.querySelector("#challenge-confirm").style.display = "none";
}

function challengeConfirm(challenge){
	document.querySelector("#challenge-confirm-name").innerHTML = challenge.name;
	document.querySelector("#challenge-confirm").style.display = "block";
	document.querySelector("#challenge-confirm-accept").onclick = startChallenge.bind(this, challenge);
	document.querySelector("#challenge-confirm-cancel").onclick = () => document.querySelector("#challenge-confirm").style.display = "none";
}
