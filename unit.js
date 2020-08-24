console.log("Loading unit.js")

const BASE_STAT_VALUE = 210;

class Unit {
	constructor(playerOwned, name, stats, ai = "simple", current = false, loopNumber = 0){
		this.name = name;
		// Which loop this unit was created on.
		this.loopNumber = loopNumber;
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
			// Defensive
			Block: new Block(0),
			Protection: new Protection(0),
			Vampirism: new Vampirism(0),
			// Non-Combat
			Regeneration: new Regeneration(0),
		};
		for (const [key, value] of Object.entries(stats)){
			if (!this.stats[key]) continue;
			this.stats[key].value += value * (stats.level || 1);
			this.stats[key].unlock();
		}
		// Number of times this unit's caps can be increased.
		this.capBreakers = 0;
		// Only relevant to player units - the player can have 3 units (plus the current one) active at a time.
		this.active = true;
		// Spendable xp if a player unit, xp granted if an enemy
		this.xp = 0;
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
	}
	
	attack(enemy){
		let attackStats = {
			enemy: enemy,
			attacker: this,
			attacks: 1,
			hits: 0,
			damage: 0,
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
	}

	getStatValue(){
		return this.getSpentStatValue() + this.xp;
	}

	getSpentStatValue(){
		return Object.values(this.stats).reduce((a, stat) => a + stat.getXpAmount(), 0) - BASE_STAT_VALUE;
	}

	breakCap(stat){
		if (this.capBreakers > 0){
			if (this.stats[stat].increaseCap()){
				this.capBreakers--;
			}
		}
		// Assumes that this is the selected unit when upgrading.
		this.display();
	}

	spendXp(stat, isCurrent){
		if (this.xp >= 1){
			this.xp -= 1 - this.stats[stat].gainXp(1);
		}
		// Assumes that this is the selected unit when upgrading.
		this.display(isCurrent);
		this.updateXP();
	}
	
	display(forceCurrent){
		let statTemplate = document.querySelector("#stat-template");
		if (this.playerOwned){
			document.querySelector(this.current || forceCurrent ? "#current-unit-wrapper .col-header" : "#other-unit-wrapper .col-header").innerHTML = "You #" + this.loopNumber;
		} else {
			document.querySelector(this.current || forceCurrent ? "#current-unit-wrapper .col-header" : "#other-unit-wrapper .col-header").innerHTML = this.name;
		}
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
				} else {
					statEl.querySelector(".cap-increase").style.display = "none";
				}
				statEl.onclick = this.spendXp.bind(this, stat.getQualifiedName(), this.current || forceCurrent);
				if (stat.name == "Health"){
					let current = document.createElement("div");
					statEl.append(current);
					current.classList.add("current");
				}
			}
			statEl.querySelector(".cap-increase").style.display = this.capBreakers ? "inline" : "none";
			statEl.querySelector(".value").innerHTML = stat.isPercent ? (stat.value * 100) + "%" : stat.value;
			statEl.querySelector(".description").innerHTML = stat.description;
			if (stat.cap !== Infinity){
				statEl.querySelector(".cap").innerHTML = "(" + (stat.isPercent ? (stat.cap * 100) + "%" : stat.cap) + ")";
			}
		});
		this.displayStatus(forceCurrent);
	}
	
	displayStatus(forceCurrent){
		let unitElWrapper = document.querySelector(this.current || forceCurrent ? "#current-unit-wrapper" : "#other-unit-wrapper");
		unitElWrapper.querySelector(".xp-amount").innerHTML = Math.floor(this.xp);
		unitElWrapper.querySelector(".cap-breakers").innerHTML = this.capBreakers;
		unitElWrapper.querySelector(".ai").innerHTML = this.ai.name;
		document.querySelector(`#${this.current || forceCurrent ? "current" : "other"}-unit .Health .current`).style.width = `${100 * this.stats.Health.current / this.stats.Health.value}%`;
		if (!this.dead){
			maps[currentLevel].highlight(this.current || forceCurrent ? 1 : 0, this.x, this.y);
		} else {
			maps[currentLevel].noHighlight(this.current || forceCurrent ? 1 : 0);
		}
	}

	onKill(xp){
		let killStats = {
			xp: xp,
		}
		Object.values(this.stats).forEach(s => s.onKill(killStats));
		this.xp += killStats.xp;
		// Fix rounding errors.  0.005 is the smallest increment of xp you can gain, so once we get past that we know we can round up.
		if (this.xp % 1 > 0.999) this.xp = Math.ceil(this.xp);
		this.updateXP();
	}

	// Update the total/free xp in the party list.
	updateXP(){}

	tick(){
		if (this.dead) return;
		let move = this.ai.move(maps[currentLevel], this);
		if (move.type == "attack"){
			this.attack(move.enemy);
		} else if (move.type == "move"){
			this.x = move.x;
			this.y = move.y;
		}
	}

	refillHealth(){
		this.stats.Health.current = this.stats.Health.value;
	}
}