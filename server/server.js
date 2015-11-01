Shell = Meteor.npmRequire('shelljs');
Spawn = Meteor.npmRequire('child_process').spawn;
Future = Meteor.npmRequire('fibers/future');
FileSystem = Meteor.npmRequire('fs');

serverMessages = new ServerMessages();

Meteor.startup(function () {

	resetOnRestart();

	EasySearch.createSearchIndex('sounds', {
		'field': ['path'],
		'collection': SoundCollection,
		'limit': 10
	});

	SoundCollection.initEasySearch(['path'], {
		'limit': 10,
		'use': 'mongo-db'
	});

	console.log("SoundCollection has " + SoundCollection.find().count() + " entries");
});

Meteor.methods({
	playSound: function (sound_id) {
		console.log("Client called playSound");
		this.unblock();
		//playAsync(sound_id);
		addSoundToPlayQueue(sound_id);
	},
	killSounds: function () {
		console.log("Client called killSounds");
		clearPlayQueue();
		killSounds();
	},
	resetSerialConnection: function () {
		console.log("Client called resetSerialConnection");
		resetSerialConnection();
	},
	switchHdmiPort: function (port_id) {
		console.log("Client called switchHdmiPort");
		switchHdmiPort(port_id);
	},
	saveSetting: function (key, value) {
		console.log("Client called saveSetting");
		saveSetting(key, value);
	},
	getSetting: function (key) {
		console.log("Client called getSetting");
		return getSetting(key);
	},
	updateSoundCollection: function () {
		console.log("Client called updateSoundCollection");
		this.unblock();
		updateFsSoundsCollections();
		notifyClients("Sounds update finished", "success");
	},
	rescanSoundCollection: function () {
		console.log("Client called rescanSoundCollection");
		this.unblock();
		rescanSoundCollection();
		notifyClients("Sounds initialization finished", "success");
	},
	removeDeletedSounds: function () {
		console.log("Client called removeDeletedSounds");
		removeDeletedSounds();
	},
	toggleFav: function (sound_id) {
		console.log("Client called toggleFav");
		var faved = FavCollection.find({user_id: Meteor.userId(), sound_id: sound_id}).count() > 0;
		if(faved){
			FavCollection.remove({user_id: Meteor.userId(), sound_id: sound_id});
		} else {
			FavCollection.insert({
				sound_id: sound_id,
				user_id: Meteor.userId()
			});
		}
		console.log(FavCollection.find({user_id: Meteor.userId()}).fetch());
	}
});

Meteor.publish("sounds", function () {
	return SoundCollection.find();
});

Meteor.publish("categories", function () {
	return CategoryCollection.find({},{sort: { category_name: 1 }});
});

Meteor.publish("settings", function () {
	return SettingsCollection.find();
});

Meteor.publish("favorites", function () {
	return FavCollection.find({user_id: this.userId});
});


resetOnRestart = function resetOnRestart() {
	clearPlayQueue();
	killChildProcesses();
	killPlayScript();
	killPlayInstances();
	removeLockfile();
};
