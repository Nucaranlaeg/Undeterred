class Challenge {
	constructor(name, description, reward, rewardDescription, illegalStats, completeLevel, completeReward, completionEnds = false){
		this.name = name;
		this.description = description;
		this.reward = reward;
		this.rewardDescription = rewardDescription;
		this.illegalStats = illegalStats;
		this.locked = true;
		this.bestFloor = 0;
		this.completeLevel = completeLevel;
		this.completeReward = completeReward;
		this.completionEnds = completionEnds;
	}

	isIllegal(stat){
		return this.illegalStats.includes(stat.getQualifiedName());
	}

	updateReward(){
		if (this.bestFloor > this.completeLevel && this.completionEnds){
			startChallenge(null);
			return;
		}
		while (this.bestFloor <= currentLevel){
			// Should only ever happen once at a time...
			this.reward();
			this.bestFloor++;
		}
		if (this.bestFloor == this.completeLevel){
			this.completeReward();
			if (this.completionEnds) startChallenge(null);
		}
	}
}

let activeChallenge = null;

let challenges = {
	LowDamage: new Challenge("Low Damage", "Delve without the ability to increase your damage.  After beating level 20, improves to the No Offense challenge.", gainBase([["Damage", 2]]), "+2 Damage", ["Damage"], 20, unlockChallenge("NoOffense"), true),
	LowHealth: new Challenge("Low Health", "Delve without the ability to increase your health.  After beating level 20, improves to the No Defense challenge.", gainBase([["Health", 20]]), "+20 Health", ["Health"], 20, unlockChallenge("NoDefense"), true),
	PlusTwoLevels: new Challenge("Plus Two Levels", "Delve, but each monster is leveled up twice.", ()=>{}, "+0.5 XP each floor", []),
	Accuracy: new Challenge("Accuracy", "Delve, but all monsters have 100x as much To-Hit.", gainBase([["Protection", 2]]), "+2 Protection", []),
	Criticality: new Challenge("Criticality", "Delve, but all enemy attacks crit one additional time.  After beating level 20, unlocks the Critical Damage Autobuyer.", gainBase([["CriticalDamage", 0.02]]), "+2% Critical Damage", [], 20, unlockAutobuyer("CriticalDamage")),
	NoOffense: new Challenge("No Offense", "Delve without the ability to increase any offensive stat.", gainBase([["ToHit", 2], ["Damage", 2]]), "+2 To-Hit & Damage", ["Damage", "ToHit", "Multiattack", "CriticalHit", "CriticalDamage", "Bleed"]),
	NoDefense: new Challenge("No Defense", "Delve without the ability to increase any defensive stat.", gainBase([["Dodge", 2], ["Health", 20]]), "+2 Dodge & +20 Health", ["Health", "Dodge", "Protection", "Block", "Regeneration", "Vampirism", "Blunting"]),
	NoRespawn: new Challenge("Restless", "Delve, but there is no healing between levels.  After beating level 20, unlocks the Regeneration Autobuyer.", () => {}, "+5% regen effectiveness", [], 20, unlockAutobuyer("Regeneration")),
};

function gainBase(stats){
	return () => {
		stats.forEach(([stat, value]) => {
			baseStats[stat] += value;
			playerUnits.forEach(unit => unit.stats[stat].addBase(value));
			autobuyerUnits.forEach(autobuyer => autobuyer.stats[stat].addBase(value));
		});
		calculateBaseStatValue();
		if (selectedUnit){
			selectedUnit.display();
		}
	};
}

function unlockChallenge(name){
	return () => {
		applyReward(`Challenge ${name}`);
	};
}

function unlockAutobuyer(name){
	return () => {
		applyReward(`Autobuyer ${name}`);
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
		if (challenge.locked || (challenge.completionEnds && challenge.bestFloor == challenge.completeLevel)) continue;
		let cEl = challengeTemplate.cloneNode(true);
		cEl.removeAttribute("id");
		cEl.querySelector(".name").innerHTML = challenge.name;
		cEl.querySelector(".description").innerHTML = challenge.description;
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
	if (challenge){
		playerUnits = [];
		offlineData.xpPerSec = 0;
		document.querySelector("#xp-per-sec").innerHTML = formatNumber(offlineData.xpPerSec);
		clearAutobuy();
	}
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
