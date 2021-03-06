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
		addSoundToPlayQueue(sound_id);
	},
	killSounds: function () {
		console.log("Client called killSounds");
		clearPlayQueue();
		killSounds();
		notifyClients("KILLER!", "error");
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
	removeDeletedSounds: function () {
		console.log("Client called removeDeletedSounds");
		removeDeletedSounds();
		notifyClients("Deleted sounds removed", "success");
	},
	toggleFav: function (sound_path) {
		console.log("Client called toggleFav");
		var faved = FavCollection.find({user_id: Meteor.userId(), sound_path: sound_path}).count() > 0;
		if(faved){
			FavCollection.remove({user_id: Meteor.userId(), sound_path: sound_path});
		} else {
			FavCollection.insert({
				sound_path: sound_path,
				user_id: Meteor.userId()
			});
		}
		console.log(FavCollection.find({user_id: Meteor.userId()}).fetch());
	},
	removeFromPlayQueue: function (pqid) {
		this.unblock();
		console.log("Client called removeFromPlayQueue " + pqid);
		var current = getPlayQueueSorted()[0]._id;
		PlayQueueCollection.remove({_id: pqid});
		if(current == pqid){
			killPlayScript();
			killPlayInstances();
			removeLockfile();
			playNext();
		}
	},
	grabYT : function (yturl, ytfrom, ytto) {
		console.log("Client called grabYT");
		grabYT(yturl,ytfrom,ytto);
	},
	playYT : function (yturl, ytfrom, ytto) {
		console.log("Client called playYT");
		playYT(yturl,ytfrom,ytto);
	},
	addTimer : function (sound_id, cronSetting, cronName) {
		console.log("Client called addTimer");
		if(addCronJob("sound-alert", cronSetting, sound_id)){
			addCronJobToTimerCollection(cronName, "sound-alert", cronSetting, sound_id);
			return true;
		} else {
			return false;
		}
	},
	deleteTimer : function (timer_id) {
		console.log("Client called deleteTimer");
		deleteCronJob(timer_id);
	},
	deleteSound : function (sound_id) {
		console.log("Client called deleteSound");
		var sound = SoundCollection.findOne({_id: sound_id});
		deleteSound(sound);
	}
});

Meteor.publish("sounds", function () {
	return SoundCollection.find();
});

Meteor.publish("playQueue", function () {
	return PlayQueueCollection.find();
});

Meteor.publish("categories", function () {
	return CategoryCollection.find();
});

Meteor.publish("timers", function () {
	return TimerCollection.find();
});

Meteor.publish("settings", function () {
	return SettingsCollection.find();
});

Meteor.publish("favorites", function () {
	return FavCollection.find({user_id: this.userId});
});


resetOnRestart = function resetOnRestart() {
	console.log("Clear startup state");
	clearPlayQueue();
	killPlayScript();
	killPlayInstances();
	removeLockfile();
	clearCronJobs();
	buildCronJobs();
	initSoundCollectionIfEmpty();
};

