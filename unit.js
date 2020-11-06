class Unit {
	constructor(playerOwned, name, stats, ai = "Simple", current = false, loopNumber = 0, role = 0){
		this.name = name;
		// Which loop this unit was created on.
		this.loopNumber = loopNumber;
		// Which autobuyer this looks at.
		this.role = role;
		// If this unit belongs to the player.
		this.playerOwned = playerOwned;
		// If this unit is the current player.
		this.current = current;
		// The order of the stats is the order in which they're called (though it's separated out into multiple tiers)
		// So changing the order can have effects, though it's mostly fine.
		this.stats = {
			// Core
			Health: new Health(0),
			Damage: new Damage(0),
			ToHit: new ToHit(0),
			Dodge: new Dodge(0),
			// Attack Modifiers
			Multiattack: new Multiattack(0),
			CriticalHit: new CriticalHit(0),
			CriticalDamage: new CriticalDamage(2),
			Bleed: new Bleed(0),
			// Defensive
			Protection: new Protection(0),
			Block: new Block(0),
			Blunting: new Blunting(0),
			Vampirism: new Vampirism(0),
			// Other
			Range: new Range(1),
			// Non-Combat
			Regeneration: new Regeneration(0),
			Haste: new Haste(0),
		};
		let extraLevels = 0;
		if (activeChallenge && activeChallenge.name == "Plus Two Levels" && name != "You"){
			extraLevels = 2;
		}
		for (const [key, value] of Object.entries(stats)){
			if (!this.stats[key]) continue;
			if (key == "Range"){
				this.stats[key].addBase(value);
			} else if (key == "CriticalDamage"){
				this.stats[key].addBase(((value || 2) - 2) * ((stats.level || 1) + extraLevels));
			} else {
				this.stats[key].addBase(value * ((stats.level || 1) + extraLevels));
			}
			this.stats[key].unlock();
		}
		if (activeChallenge && activeChallenge.name == "Accuracy" && name != "You"){
			this.stats.ToHit.value *= 100;
		}
		// Number of times this unit's caps can be increased.
		this.capBreakers = 0;
		// Only relevant to player units - the player can have 3 units (plus the current one) active at a time.
		this.active = true;
		// Spendable xp if a player unit, xp granted if an enemy
		this.xp = 0;
		// Amount of xp when run complete; affects xp gained when not the current unit.
		this.deathXp = 0;
		// Which AI this unit uses to move around
		this.ai = ais[ai];
		// Coordinates on the current map
		this.x = 0;
		this.y = 0;
		// If the unit is, in fact, alive
		this.dead = false;
		// The character to display on the map
		this.character = "";
		// Whether this unit can be deleted.
		this.preventRemoval = false;
		// For maintaining a better list of enemies.
		this.enemySummaryNode = null;
		// The conditions which can be applied to this unit
		this.conditions = {
			Bleeding: new Bleeding(),
		};
		// For checking that this is not an autobuyer.
		this.isAutobuyer = false;
	}
	
	attack(enemy){
		let attackStats = {
			enemy: enemy,
			attacker: this,
			attacks: 1,
			hits: 0,
			damage: 0,
			bleed: 0,
		}
		this.stats.Multiattack.onBeginAttack(attackStats);
		Object.values(this.stats).forEach(s => s.onAttack(attackStats));
		if (attackStats.hits == 0) return 0;
		Object.values(this.stats).forEach(s => s.onHit(attackStats));
		if (attackStats.damage == 0) return 0;
		Object.values(this.stats).forEach(s => s.onDamage(attackStats));
		Object.values(enemy.stats).forEach(s => s.onTakeDamage(attackStats));
		enemy.stats.Health.takeDamage(attackStats);
	}

	die(){
		if (!this.playerOwned){
			grantXp(this.xp);
		}
		this.dead = true;
		if (this == selectedUnit){
			maps[currentLevel].noHighlight(0);
		}
		this.removeSummary();
	}
	
	removeSummary(){
		if (this.enemySummaryNode){
			this.enemySummaryNode.parentNode.removeChild(this.enemySummaryNode);
			this.enemySummaryNode = null;
		}
	}

	getStatValue(){
		return this.getSpentStatValue() + this.xp;
	}

	getSpentStatValue(){
		return Object.values(this.stats).reduce((a, stat) => a + stat.getXpAmount(), 0) - base_stat_value;
	}

	breakCap(stat, isCurrent, event){
		if (this.capBreakers > this.stats[stat].breaks){
			if (this.stats[stat].increaseCap()){
				this.capBreakers -= this.stats[stat].breaks;
			}
		}
		if (event) event.stopPropagation();
		this.display(isCurrent);
	}

	unBreakCap(stat, isCurrent, event){
		if (this.stats[stat].decreaseCap()){
			this.capBreakers += this.stats[stat].breaks + 1;
			this.display(isCurrent);
			return true;
		}
		return false;
	}

	spendXp(stat, isCurrent, event, amount){
		if (!this.playerOwned) return;
		if (this.xp >= 1){
			let xpToSpend = Math.min(Math.floor(this.xp), amount || settings.multiXp);
			this.xp -= xpToSpend - this.stats[stat].gainXp(xpToSpend);
		}
		if (isCurrent || event){
			this.display(isCurrent);
		}
		this.updateXP();
	}

	changeRole(event){
		this.role = event.target.value;
	}
	
	display(forceCurrent){
		let statTemplate = document.querySelector("#stat-template");
		if (this.playerOwned){
			document.querySelector(this.current || forceCurrent ? "#current-unit-wrapper .col-header" : "#other-unit-wrapper .col-header").innerHTML = "You #" + this.loopNumber;
		} else {
			document.querySelector(this.current || forceCurrent ? "#current-unit-wrapper .col-header" : "#other-unit-wrapper .col-header").innerHTML = this.name;
		}
		document.querySelector(this.current || forceCurrent ? "#current-unit-wrapper .ai" : "#other-unit-wrapper .ai").onchange = e => {
			if (this.playerOwned){
				this.ai = ais[e.target.value];
			} else {
				e.target.value = this.ai.name;
			}
		};
		document.querySelector(this.current || forceCurrent ? "#current-unit-wrapper .role" : "#other-unit-wrapper .role").onchange = this.changeRole;
		let unitEl = document.querySelector(this.current || forceCurrent ? "#current-unit" : "#other-unit");
		while (unitEl.firstChild){
			unitEl.removeChild(unitEl.lastChild);
		}
		Object.values(this.stats).forEach(stat => {
			if (stat.locked) return;
			let statEl = unitEl.querySelector(`.${stat.getQualifiedName()}`);
			if (!statEl){
				statEl = statTemplate.cloneNode(true);
				statEl.removeAttribute("id");
				statEl.classList.add(stat.getQualifiedName());
				unitEl.append(statEl);
				statEl.querySelector(".name").innerHTML = stat.name;
				if (stat.capIncrease){
					statEl.querySelector(".cap-increase").onclick = this.breakCap.bind(this, stat.getQualifiedName(), this.current);
					statEl.querySelector(".cap-increase").oncontextmenu = e => {
						this.unBreakCap(stat.getQualifiedName(), this.current);
						e.preventDefault();
						e.stopPropagation();
					};
				}
				statEl.onclick = this.spendXp.bind(this, stat.getQualifiedName(), this.current || forceCurrent);
				if (stat.name == "Health"){
					let current = document.createElement("div");
					statEl.append(current);
					current.classList.add("current");
				}
			}
			statEl.querySelector(".cap-increase").style.display = this.capBreakers > stat.breaks && stat.capIncrease ? "inline" : "none";
			statEl.querySelector(".value").innerHTML = formatNumber(stat.isPercent ? stat.value * 100 : stat.value) + (stat.isPercent ? "%" : "");
			statEl.querySelector(".description").innerHTML = stat.description;
			if (stat.cap !== Infinity && this.playerOwned){
				statEl.querySelector(".cap").innerHTML = "(" + (stat.isPercent ? formatNumber(stat.cap * 100) + "%" : formatNumber(stat.cap)) + ")";
			}
			if (activeChallenge && activeChallenge.isIllegal(stat)) statEl.classList.add("disabled");
		});
		this.displayStatus(forceCurrent);
	}
	
	displayStatus(forceCurrent){
		let unitElWrapper = document.querySelector(this.current || forceCurrent ? "#current-unit-wrapper" : "#other-unit-wrapper");
		unitElWrapper.querySelector(".xp-amount").innerHTML = Math.floor(this.xp);
		unitElWrapper.querySelector(".cap-breakers").innerHTML = this.capBreakers;
		unitElWrapper.querySelector(".ai").value = this.ai.name;
		if (this.current || forceCurrent){
			unitElWrapper.querySelector(".ai").removeAttribute("disabled");
		} else {
			unitElWrapper.querySelector(".role-wrapper").style.display = (this.name == "You" || this.isAutobuyer) && unlockedRoles ? "block" : "none";
			let offlineXpButton = unitElWrapper.querySelector("#offline-xp-button");
			if (this.offlineTimeCost() < offlineData.offlineTime){
				offlineXpButton.style.display = "inline-block";
				offlineXpButton.querySelector(".offline-xp-button-desc").innerHTML = `Cost for ${settings.multiXp} xp: ${formatNumber(this.offlineTimeCost() / 1000)}s`;
				offlineXpButton.onclick = this.spendOfflineTime.bind(this);
			} else {
				offlineXpButton.style.display = "none";
			}
			// unitElWrapper.querySelector(".ai").disabled = true;
		}
		if (!this.dead){
			document.querySelector(`#${this.current || forceCurrent ? "current" : "other"}-unit .Health .current`).style.width = `${100 * this.stats.Health.current / this.stats.Health.value}%`;
			maps[currentLevel].highlight(this.current || forceCurrent ? 1 : 0, this.x, this.y);
		} else {
			document.querySelector(`#${this.current || forceCurrent ? "current" : "other"}-unit .Health .current`).style.width = `0%`;
			maps[currentLevel].noHighlight(this.current || forceCurrent ? 1 : 0);
		}
		let conditionTemplate = document.querySelector("#condition-template");
		let conditionWrapper = document.querySelector(this.current || forceCurrent ? "#current-conditions" : "#other-conditions");
		Object.values(this.conditions).forEach(condition => {
			if (!condition.isApplied) return;
			let conditionEl = conditionWrapper.querySelector(`.${condition.getQualifiedName()}`);
			if (!conditionEl){
				conditionEl = conditionTemplate.cloneNode(true);
				conditionEl.removeAttribute("id");
				conditionEl.classList.add(condition.getQualifiedName());
				conditionEl.querySelector(".name").innerHTML = condition.name;
				conditionEl.classList.add(condition.type);
				conditionWrapper.append(conditionEl);
			}
			if (condition.value == 0){
				conditionEl.style.display = "none";
			} else {
				conditionEl.style.display = "block";
				conditionEl.querySelector(".value").innerHTML = formatNumber(condition.value);
				conditionEl.querySelector(".description").innerHTML = condition.description;
			}
		});
	}

	onKill(xp, kills = 1){
		let killStats = {
			xp: this.current ? xp : xp / getXpSlowdown(this.deathXp, this.getStatValue()),
			kills: kills,
		}
		Object.values(this.stats).forEach(s => s.onKill(killStats));
		this.xp += killStats.xp;
		// Fix rounding errors.
		if (this.xp % 1 > 0.99999) this.xp = Math.ceil(this.xp);
		this.autobuy();
		this.updateXP();
	}

	// Check if autobuying is needed, and if so, do it.
	autobuy(){
		if (!settings.autobuyer) return;
		this.autobuyCapBreakers();
		let autobuyStats = Object.keys(autobuyerUnits[this.role].stats);
		shuffle(autobuyStats);
		let index = 0;
		while (this.xp >= 1 && autobuyStats.length){
			if (autobuyerUnits[this.role].stats[autobuyStats[index]].value - 0.001 > this.stats[autobuyStats[index]].value){
				let startingValue = this.stats[autobuyStats[index]].value;
				this.spendXp(autobuyStats[index], this.current, null, 1);
				// If we're at the cap or something else prevents us from buying...
				if (startingValue == this.stats[autobuyStats[index]].value){
					autobuyStats.splice(index, 1);
				}
			} else {
				autobuyStats.splice(index, 1);
			}
			index = (index + 1) % autobuyStats.length;
		}
	}

	autobuyCapBreakers(){
		if (!settings.autobuyer) return;
		let autobuyStats = Object.entries(autobuyerUnits[this.role].stats).filter(stat => {
			return this.stats[stat[0]].cap < stat[1].cap;
		});
		shuffle(autobuyStats);
		let index = 0;
		while (this.capBreakers >= 1 && autobuyStats.length){
			if (autobuyStats[index][1].cap > this.stats[autobuyStats[index][0]].cap){
				this.breakCap(autobuyStats[index][0], true, null, 1);
			} else {
				autobuyStats.splice(index, 1);
			}
			index = (index + 1) % autobuyStats.length;
		}
	}

	// Update the total/free xp in the party list.
	updateXP(){}

	tick(extraTicks = null){
		if (this.dead) return;
		Object.values(this.stats).forEach(s => s.onTick(this));
		Object.values(this.conditions).forEach(s => s.onTick(this));
		let move = this.ai.move(maps[currentLevel], this);
		if (move.type == "attack"){
			this.attack(move.enemy);
		} else if (move.type == "move"){
			this.x = move.x;
			this.y = move.y;
		}
		if (extraTicks === null){
			extraTicks = this.stats.Haste.getTicks();
		}
		if (extraTicks > 0){
			return this.tick(extraTicks - 1);
		}
	}

	refillHealth(){
		this.stats.Health.current = this.stats.Health.value;
		Object.values(this.conditions).forEach(s => s.reset());
	}

	offlineTimeCost(){
		return (getXpSlowdown(this.deathXp, this.getStatValue()) * settings.multiXp / 2 + getXpSlowdown(this.deathXp, this.getStatValue() + settings.multiXp) * settings.multiXp / 2) / offlineData.xpPerSec * 1000;
	}

	spendOfflineTime(){
		let cost = this.offlineTimeCost();
		if (cost <= offlineData.offlineTime){
			offlineData.offlineTime -= cost;
			this.xp += settings.multiXp;
			this.autobuy();
			this.updateXP();
			this.displayStatus(false);
			offlineTimeEl.innerHTML = formatNumber(offlineData.offlineTime / 1000);
		}
	}
}

function getXpSlowdown(deathXp, total){
	let result = deathXp + (total - deathXp) * 4 || 1;
	if (total > deathXp * 1.1){
		result *= Math.pow(total / deathXp, 2);
	}
	return result;
}

// Utility functions
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function formatNumber(number){
	if (Math.abs(Math.round(number) - number) < 0.01){
		return Math.round(number);
	}
	return Math.round(number * 10) / 10;
}
