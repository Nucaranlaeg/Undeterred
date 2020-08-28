let helpMessages = {
	RemoveUnitsFromParty: ["Click on a unit to view it.  Click on an allied unit a second time to add it to your party or remove it from your party."],
};
let lastMessage = "";

function displayHelpMessage(message){
	if (!helpMessages[message][1]){
		displayMessage(helpMessages[message][0]);
		helpMessages[message][1] = true;
	}
}

function displayMessage(message){
	if (message == lastMessage) return;
	lastMessage = message;
	let messageWrapperEl = document.querySelector("#messages");
	let messageEl = document.querySelector("#message-template").cloneNode(true);
	messageEl.removeAttribute("id");
	messageEl.innerHTML = message;
	messageWrapperEl.prepend(messageEl);
}

function clearMessages(){
	let messageWrapperEl = document.querySelector("#messages");
	while (messageWrapperEl.firstChild){
		messageWrapperEl.removeChild(messageWrapperEl.lastChild);
	}
}

setTimeout(() => {
	displayMessage("Welcome to Undeterred!");
	displayMessage("You enter a cavern, deeper than you could possibly imagine.");
});
