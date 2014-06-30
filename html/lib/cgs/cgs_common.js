(function ($hx_exports) { "use strict";
$hx_exports.cgs = $hx_exports.cgs || {};
$hx_exports.cgs.user = $hx_exports.cgs.user || {};
;$hx_exports.cgs.server = $hx_exports.cgs.server || {};
$hx_exports.cgs.server.logging = $hx_exports.cgs.server.logging || {};
;$hx_exports.cgs.http = $hx_exports.cgs.http || {};
$hx_exports.cgs.http.responses = $hx_exports.cgs.http.responses || {};
;$hx_exports.cgs.http.requests = $hx_exports.cgs.http.requests || {};
function $extend(from, fields) {
	function Inherit() {} Inherit.prototype = from; var proto = new Inherit();
	for (var name in fields) proto[name] = fields[name];
	if( fields.toString !== Object.prototype.toString ) proto.toString = fields.toString;
	return proto;
}
var EReg = function(r,opt) {
	opt = opt.split("u").join("");
	this.r = new RegExp(r,opt);
};
EReg.__name__ = true;
EReg.prototype = {
	match: function(s) {
		if(this.r.global) this.r.lastIndex = 0;
		this.r.m = this.r.exec(s);
		this.r.s = s;
		return this.r.m != null;
	}
	,matched: function(n) {
		if(this.r.m != null && n >= 0 && n < this.r.m.length) return this.r.m[n]; else throw "EReg::matched";
	}
	,__class__: EReg
};
var HxOverrides = function() { };
HxOverrides.__name__ = true;
HxOverrides.cca = function(s,index) {
	var x = s.charCodeAt(index);
	if(x != x) return undefined;
	return x;
};
HxOverrides.substr = function(s,pos,len) {
	if(pos != null && pos != 0 && len != null && len < 0) return "";
	if(len == null) len = s.length;
	if(pos < 0) {
		pos = s.length + pos;
		if(pos < 0) pos = 0;
	} else if(len < 0) len = s.length + len - pos;
	return s.substr(pos,len);
};
HxOverrides.indexOf = function(a,obj,i) {
	var len = a.length;
	if(i < 0) {
		i += len;
		if(i < 0) i = 0;
	}
	while(i < len) {
		if(a[i] === obj) return i;
		i++;
	}
	return -1;
};
HxOverrides.iter = function(a) {
	return { cur : 0, arr : a, hasNext : function() {
		return this.cur < this.arr.length;
	}, next : function() {
		return this.arr[this.cur++];
	}};
};
var Lambda = function() { };
Lambda.__name__ = true;
Lambda.indexOf = function(it,v) {
	var i = 0;
	var $it0 = $iterator(it)();
	while( $it0.hasNext() ) {
		var v2 = $it0.next();
		if(v == v2) return i;
		i++;
	}
	return -1;
};
var IMap = function() { };
IMap.__name__ = true;
Math.__name__ = true;
var Reflect = function() { };
Reflect.__name__ = true;
Reflect.field = function(o,field) {
	try {
		return o[field];
	} catch( e ) {
		return null;
	}
};
Reflect.setField = function(o,field,value) {
	o[field] = value;
};
Reflect.fields = function(o) {
	var a = [];
	if(o != null) {
		var hasOwnProperty = Object.prototype.hasOwnProperty;
		for( var f in o ) {
		if(f != "__id__" && f != "hx__closures__" && hasOwnProperty.call(o,f)) a.push(f);
		}
	}
	return a;
};
Reflect.deleteField = function(o,field) {
	if(!Object.prototype.hasOwnProperty.call(o,field)) return false;
	delete(o[field]);
	return true;
};
var Std = function() { };
Std.__name__ = true;
Std.string = function(s) {
	return js.Boot.__string_rec(s,"");
};
Std["int"] = function(x) {
	return x | 0;
};
Std.parseFloat = function(x) {
	return parseFloat(x);
};
var StringTools = function() { };
StringTools.__name__ = true;
StringTools.fastCodeAt = function(s,index) {
	return s.charCodeAt(index);
};
var Type = function() { };
Type.__name__ = true;
Type.createEmptyInstance = function(cl) {
	function empty() {}; empty.prototype = cl.prototype;
	return new empty();
};
var cgs = {};
cgs.CgsApiSimple = $hx_exports.cgs.CgsApi = function(requestHandler,serverTag,defaultCache,defaultUserManager) {
	if(serverTag == null) serverTag = "dev";
	this._lastGameId = 0;
	this._releaseMode = "DEV";
	if(defaultUserManager != null) this._userManager = defaultUserManager; else this._userManager = new cgs.user.CgsUserManager();
	this._abTestingProperties = new cgs.server.abtesting.AbTestingVariables();
	this.setUrlRequestHandler(requestHandler);
	this._cache = defaultCache;
	this.updateNtpTime(serverTag);
};
cgs.CgsApiSimple.__name__ = true;
cgs.CgsApiSimple.prototype = {
	hasServerData: function() {
		if(this._userManager.getNumUsers() == 0) return false;
		var hasServerData = false;
		var _g = 0;
		var _g1 = this._userManager.getUserList();
		while(_g < _g1.length) {
			var cgsUser = _g1[_g];
			++_g;
			hasServerData = hasServerData || cgsUser.flushServerRequests();
		}
		return hasServerData;
	}
	,setReleaseMode: function(mode) {
		if(mode == null) mode = "DEV";
		this._releaseMode = mode;
	}
	,isProductionRelease: function() {
		return this._releaseMode == "PRD";
	}
	,isDevelopmentRelease: function() {
		return this._releaseMode == "DEV";
	}
	,setUrlRequestHandler: function(handler) {
		this._requestHandler = handler;
	}
	,createRequestService: function(serviceUrl) {
		return new cgs.server.services.RequestService(this._requestHandler,serviceUrl);
	}
	,createChallengeService: function(user,challengeId) {
		var server = (js.Boot.__cast(user , cgs.user.CgsUser)).getServer();
		var props = server.getCurrentGameServerData();
		var challengeService = new cgs.server.challenge.ChallengeService(this._requestHandler,js.Boot.__cast(user , cgs.user.CgsUser),challengeId,props.getServerTag(),props.getServerVersion());
		return challengeService;
	}
	,createMultiplayerLoggingService: function(props) {
		var server = new cgs.server.services.CgsServerApi(this._requestHandler,this._ntpTime,this,this._cacheFactory);
		server.setupMultiplayerLogging(props);
		var service = new cgs.server.services.MultiplayerLoggingService(server,this._requestHandler,props.getServerTag(),props.getServerVersion());
		return service;
	}
	,createLoggingDataService: function(props) {
		var server = new cgs.server.services.CgsServerApi(this._requestHandler,this._ntpTime,null,this._cacheFactory);
		server.setup(props);
		var service = new cgs.server.services.LoggingDataService(this._requestHandler,server,props.getServerTag(),props.getServerVersion());
		return service;
	}
	,createIntegrationDataService: function(props) {
		var server = new cgs.server.services.CgsServerApi(this._requestHandler,this._ntpTime,null,this._cacheFactory);
		server.setup(props);
		var service = new cgs.server.services.IntegrationDataService(this._requestHandler,server,props.getServerTag(),props.getServerVersion());
		return service;
	}
	,updateNtpTime: function(serverTag) {
		if(this._ntpTime == null) this._ntpTime = new cgs.server.services.NtpTimeService(this._requestHandler,serverTag);
	}
	,getUserManager: function() {
		return this._userManager;
	}
	,removeUser: function(user) {
		this._userManager.removeUser(user);
	}
	,addUser: function(user) {
		this._userManager.addUser(user);
	}
	,initializeUser: function(props) {
		var user = this.createUser(props);
		this.addUser(user);
		user.initializeAnonymousUser(props);
		return user;
	}
	,isUserAuthenticated: function(props,callback) {
		var user = this.createUser(props);
		this.handleUserAuth($bind(user,user.isUserAuthenticated),user,callback,[props]);
		return user;
	}
	,authenticateUser: function(props,userName,password,callback) {
		var user = this.createUser(props);
		this.handleUserAuth($bind(user,user.initializeAuthenticatedUser),user,callback,[props,userName,password]);
		return user;
	}
	,registerUser: function(props,name,password,email,callback) {
		var user = this.createUser(props);
		this.handleUserAuth($bind(user,user.registerUser),user,callback,[props,name,password,email]);
		return user;
	}
	,authenticateStudent: function(props,username,teacherCode,password,gradeLevel,callback) {
		if(gradeLevel == null) gradeLevel = 0;
		var user = this.createUser(props);
		this.handleUserAuth($bind(user,user.initializeAuthenticatedStudent),user,callback,[props,username,teacherCode,password,gradeLevel]);
		return user;
	}
	,registerStudent: function(props,username,teacherCode,gradeLevel,userCallback) {
		if(gradeLevel == null) gradeLevel = 0;
		var user = this.createUser(props);
		this.handleUserAuth($bind(user,user.registerStudent),user,userCallback,[props,username,teacherCode,gradeLevel]);
		return user;
	}
	,retryUserAuthentication: function(cgsUser,username,password,callback) {
		this.handleUserAuth($bind(cgsUser,cgsUser.retryAuthentication),cgsUser,callback,[username,password]);
	}
	,handleUserAuth: function(authFunction,user,userCallback,args) {
		var _g = this;
		args.push(function(response) {
			if(response.success()) _g.addUser(user);
			if(userCallback != null) userCallback(response);
		});
		authFunction.apply(null,args);
	}
	,createUser: function(props) {
		var server = new cgs.server.services.CgsServerApi(this._requestHandler,this._ntpTime,this,this._cacheFactory);
		var abTester = props.getAbTester();
		if(abTester == null && props.getLoadAbTests()) {
			abTester = new cgs.server.abtesting.UserAbTester(server);
			props.setAbTester(abTester);
		}
		if(abTester != null) abTester.setDefaultVariableProvider(this._abTestingProperties);
		if(props.getCgsCache() == null) props.setCgsCache(this._cache);
		if(this._requestHandler != null) this._requestHandler.setDelayRequestListener(props.getCacheActionForLaterCallback());
		var aUser = new cgs.user.CgsUser(server,this._cache,abTester);
		return aUser;
	}
	,registerDefaultAbVariable: function(name,value) {
		this._abTestingProperties.registerDefaultVariable(name,value);
	}
	,getRequestsObjectData: function() {
		return this._requestHandler.getObjectData();
	}
	,__class__: cgs.CgsApiSimple
};
cgs.Common = function() { };
cgs.Common.__name__ = true;
cgs.Common.main = function() {
	console.log("Startup");
};
cgs.Main = function() { };
cgs.Main.__name__ = true;
cgs.Main.main = function() {
};
cgs.achievement = {};
cgs.achievement.ICgsAchievementManager = function() { };
cgs.achievement.ICgsAchievementManager.__name__ = true;
cgs.achievement.ICgsAchievementManager.prototype = {
	__class__: cgs.achievement.ICgsAchievementManager
};
cgs.cache = {};
cgs.cache.CacheFlushStatus = function(saveId,dataSaveCount,completeCallback) {
	this._saveId = saveId;
	this._saveCount = dataSaveCount;
	this._completeCallback = completeCallback;
	this._dataIds = new Array();
	this._dataResponses = new haxe.ds.StringMap();
};
cgs.cache.CacheFlushStatus.__name__ = true;
cgs.cache.CacheFlushStatus.prototype = {
	makeCompleteCallback: function() {
		if(this._completeCallback != null) {
			this._completeCallback(this);
			this._completeCallback = null;
		}
	}
	,completed: function() {
		var responseCount = 0;
		var $it0 = this._dataResponses.keys();
		while( $it0.hasNext() ) {
			var dataKey = $it0.next();
			responseCount++;
		}
		return responseCount == this._saveCount;
	}
	,setLocalFlushStatus: function(succeeded) {
		this._localFlushSucceeded = succeeded;
	}
	,localFlushSucceedded: function() {
		return this._localFlushSucceeded;
	}
	,flushSucceeded: function() {
		var $it0 = this._dataResponses.keys();
		while( $it0.hasNext() ) {
			var dataKey = $it0.next();
			if(!this._dataResponses.get(dataKey)) return false;
		}
		return true;
	}
	,dataSaved: function(key) {
		var saved = false;
		if(this._dataResponses.exists(key)) saved = this._dataResponses.get(key);
		return saved;
	}
	,containsDataKey: function(key) {
		return this._dataResponses.exists(key);
	}
	,addDataKey: function(key) {
		this._dataIds.push(key);
	}
	,updateDataSaveStatus: function(dataKey,saveSuccess) {
		if(HxOverrides.indexOf(this._dataIds,dataKey,0) >= 0) {
			this._dataResponses.set(dataKey,saveSuccess);
			saveSuccess;
		}
	}
	,__class__: cgs.cache.CacheFlushStatus
};
cgs.cache.ICGSCache = function() { };
cgs.cache.ICGSCache.__name__ = true;
cgs.cache.ICGSCache.prototype = {
	__class__: cgs.cache.ICGSCache
};
cgs.cache.CgsCache = $hx_exports.cgs.CgsCache = function(factory) {
	this.m_factory = factory;
	this.init();
};
cgs.cache.CgsCache.__name__ = true;
cgs.cache.CgsCache.__interfaces__ = [cgs.cache.ICGSCache];
cgs.cache.CgsCache.prototype = {
	init: function() {
		this.m_privateCache = new cgs.cache._CgsCache.PrivateCache(this.m_factory);
		this.m_registeredUUIDs = new Array();
		this.m_playerCaches = new haxe.ds.StringMap();
		this.m_primaryUserID = cgs.cache.CgsCache.CACHE_NAME_OF_DEFAULT_PLAYER;
		this.registerUser(this.m_primaryUserID);
		this.m_privateCache.migrateOldCacheData(cgs.cache.CgsCache.CACHE_USER_PREFIX,this.getPlayerCacheForUser(this.m_primaryUserID));
	}
	,destroy: function() {
		this.m_privateCache = null;
		while(this.m_registeredUUIDs != null && this.m_playerCaches != null && this.m_registeredUUIDs.length > 0) {
			var registeredUser = this.m_registeredUUIDs.pop();
			var pCache = this.m_playerCaches.get(registeredUser);
			pCache.destroy();
			this.m_playerCaches.set(registeredUser,null);
		}
		this.m_registeredUUIDs = null;
		this.m_playerCaches = null;
	}
	,reset: function() {
		this.destroy();
		this.init();
	}
	,getPlayerCacheForUser: function(userID) {
		var key = this.chooseUserID(userID);
		return this.m_playerCaches.get(key);
	}
	,getPrimaryUID: function() {
		return this.m_primaryUserID;
	}
	,setPrimaryUID: function(value) {
		if(value == null) value = cgs.cache.CgsCache.CACHE_NAME_OF_DEFAULT_PLAYER;
		if(this.userRegistered(this.convertUidToCacheName(value))) this.m_primaryUserID = value;
	}
	,getSize: function() {
		return this.m_privateCache.getSize();
	}
	,userRegistered: function(userID) {
		return userID != null && userID != "" && HxOverrides.indexOf(this.m_registeredUUIDs,userID,0) >= 0;
	}
	,clearCacheForAll: function() {
		var _g = 0;
		var _g1 = this.m_registeredUUIDs;
		while(_g < _g1.length) {
			var registeredUser = _g1[_g];
			++_g;
			this.clearCache(registeredUser);
		}
		this.m_privateCache.clearSharedObject();
	}
	,clearCache: function(uid) {
		this.getPlayerCacheForUser(uid).clearCache();
	}
	,deleteSaveForAll: function(property) {
		var _g = 0;
		var _g1 = this.m_registeredUUIDs;
		while(_g < _g1.length) {
			var registeredUser = _g1[_g];
			++_g;
			this.deleteSave(property,registeredUser);
		}
	}
	,deleteSave: function(property,uid) {
		this.getPlayerCacheForUser(uid).deleteSave(property);
	}
	,flushForAll: function(callback) {
		var result = true;
		var totalUsersToFlush = 0;
		var totalUsersFlushed = 0;
		var flushForAllCallback = function() {
			totalUsersFlushed++;
			if(totalUsersFlushed >= totalUsersToFlush) callback();
		};
		var _g = 0;
		var _g1 = this.m_registeredUUIDs;
		while(_g < _g1.length) {
			var registeredUser = _g1[_g];
			++_g;
			if(callback != null) {
				totalUsersToFlush++;
				this.flush(registeredUser,flushForAllCallback);
			} else result = result && this.flush(registeredUser);
		}
		return result;
	}
	,flush: function(uid,callback) {
		return this.getPlayerCacheForUser(uid).flushPlayerCache(callback);
	}
	,hasUnsavedServerData: function(uid) {
		return this.getPlayerCacheForUser(uid).hasUnsavedServerData();
	}
	,convertUidToCacheName: function(uid) {
		if(uid.indexOf(cgs.cache.CgsCache.CACHE_USER_PREFIX) >= 0) return uid; else return cgs.cache.CgsCache.CACHE_USER_PREFIX + uid;
	}
	,chooseUserID: function(userID) {
		if(userID != null) {
			userID = this.convertUidToCacheName(userID);
			if(!this.userRegistered(userID)) userID = this.convertUidToCacheName(this.m_primaryUserID);
		} else userID = this.convertUidToCacheName(this.m_primaryUserID);
		return userID;
	}
	,registerUser: function(userID,saveToServer,serverCacheVersion,userGameData,serverApi) {
		if(serverCacheVersion == null) serverCacheVersion = 1;
		if(saveToServer == null) saveToServer = false;
		if(userID == null) {
			throw "userID provided to CGSCache.registerUser() is null! Must provide valid (non-null) userID";
			return;
		}
		userID = this.convertUidToCacheName(userID);
		if(!this.userRegistered(userID)) {
			var newPlayerCache = null;
			if(saveToServer) {
				if(userGameData != null && serverApi != null) newPlayerCache = new cgs.cache._CgsCache.PlayerCache(this.m_privateCache,userID,saveToServer,serverCacheVersion,userGameData,serverApi); else {
					var userGameDataExistsText;
					userGameDataExistsText = (userGameData != null?"":"not ") + "been specified";
					var serverApiExistsText;
					serverApiExistsText = (serverApi != null?"":"not ") + "been specified";
					throw "CGSCache - Register User: User " + userID + " cannot save to server: userGameData has " + userGameDataExistsText + " and serverApi has " + serverApiExistsText;
					newPlayerCache = new cgs.cache._CgsCache.PlayerCache(this.m_privateCache,userID);
				}
			} else newPlayerCache = new cgs.cache._CgsCache.PlayerCache(this.m_privateCache,userID);
			var isFirstRealPlayer = this.m_registeredUUIDs.length == 1 && this.userRegistered(cgs.cache.CgsCache.CACHE_NAME_OF_DEFAULT_PLAYER);
			this.m_registeredUUIDs.push(userID);
			this.m_playerCaches.set(userID,newPlayerCache);
			if(isFirstRealPlayer) this.setPrimaryUID(userID);
		}
	}
	,unregisterUser: function(userID) {
		userID = this.convertUidToCacheName(userID);
		if(userID == this.convertUidToCacheName(cgs.cache.CgsCache.CACHE_NAME_OF_DEFAULT_PLAYER)) return;
		if(this.userRegistered(userID)) {
			var pCache = this.m_playerCaches.get(userID);
			pCache.destroy();
			this.m_playerCaches.set(userID,null);
			this.m_registeredUUIDs.splice(HxOverrides.indexOf(this.m_registeredUUIDs,userID,0),1);
			if(userID == this.convertUidToCacheName(this.getPrimaryUID())) this.setPrimaryUID(null);
		}
	}
	,registerSaveCallback: function(property,callback) {
		this.m_privateCache.registerSaveCallback(property,callback);
	}
	,unregisterSaveCallback: function(property) {
		this.m_privateCache.unregisterSaveCallback(property);
	}
	,getSave: function(property,uid) {
		return this.getPlayerCacheForUser(uid).getSave(property);
	}
	,initSaveForAll: function(property,defaultVal,flush) {
		if(flush == null) flush = true;
		var _g = 0;
		var _g1 = this.m_registeredUUIDs;
		while(_g < _g1.length) {
			var registeredUser = _g1[_g];
			++_g;
			this.initSave(property,defaultVal,registeredUser,flush);
		}
	}
	,initSave: function(property,defaultVal,uid,flush) {
		if(flush == null) flush = true;
		this.getPlayerCacheForUser(uid).initSave(property,defaultVal,flush);
	}
	,saveExists: function(property,uid) {
		return this.getPlayerCacheForUser(uid).saveExists(property);
	}
	,setSaveForAll: function(property,val,flush) {
		if(flush == null) flush = true;
		var result = true;
		var _g = 0;
		var _g1 = this.m_registeredUUIDs;
		while(_g < _g1.length) {
			var registeredUser = _g1[_g];
			++_g;
			result = result && this.setSave(property,val,registeredUser,flush);
		}
		return result;
	}
	,setSave: function(property,val,uid,flush) {
		if(flush == null) flush = true;
		return this.getPlayerCacheForUser(uid).setSave(property,val,flush);
	}
	,__class__: cgs.cache.CgsCache
};
cgs.cache._CgsCache = {};
cgs.cache._CgsCache.PlayerCache = function(privateCache,uniqueID,saveToServer,serverCacheVersion,userGameData,serverApi) {
	if(serverCacheVersion == null) serverCacheVersion = 1;
	if(saveToServer == null) saveToServer = false;
	this.m_privateCache = privateCache;
	this.m_cacheUUID = uniqueID;
	this.m_flushStatusMap = new haxe.ds.IntMap();
	this.m_savingData = new haxe.ds.StringMap();
	this.m_serverCacheVersion = serverCacheVersion;
	if(saveToServer) {
		this.m_saveToServer = saveToServer;
		this.m_userGameData = userGameData;
		this.m_updateMap = new haxe.ds.StringMap();
		this.m_updateCount = 0;
		this.m_savingDataCount = 0;
		this.m_serverApi = serverApi;
		this.cloneServerDataToSharedObject();
	}
};
cgs.cache._CgsCache.PlayerCache.__name__ = true;
cgs.cache._CgsCache.PlayerCache.prototype = {
	hasUnsavedServerData: function() {
		return this.m_updateCount > 0 || this.m_savingDataCount > 0;
	}
	,cloneServerDataToSharedObject: function() {
		if(this.m_userGameData != null) {
			var _g = 0;
			var _g1 = this.m_userGameData.getKeys();
			while(_g < _g1.length) {
				var dataKey = _g1[_g];
				++_g;
				var dataValue = this.m_userGameData.getData(dataKey);
				if(dataValue != null) this.m_privateCache.setSaveToSharedObject(dataKey,dataValue,this.m_cacheUUID);
			}
			this.flushPlayerCache();
		}
	}
	,destroy: function() {
		this.m_privateCache = null;
		this.m_cacheUUID = null;
		if(this.m_saveToServer) {
			this.m_saveToServer = false;
			this.m_userGameData = null;
			this.m_updateMap = null;
			this.m_updateCount = 0;
		}
	}
	,getCacheUUID: function() {
		return this.m_cacheUUID;
	}
	,clearCache: function() {
		if(this.m_saveToServer) {
			var _g = 0;
			var _g1 = this.m_userGameData.getKeys();
			while(_g < _g1.length) {
				var dataKey = _g1[_g];
				++_g;
				this.setSave(dataKey,null,false);
			}
			this.flushPlayerCache();
		}
		this.m_privateCache.clearSharedObjectForUser(this.m_cacheUUID);
	}
	,deleteSave: function(property) {
		if(this.m_saveToServer) this.setSave(property,null,true);
		this.m_privateCache.deleteSaveFromSharedObject(property,this.m_cacheUUID);
	}
	,flushPlayerCache: function(callback) {
		var flushStatus = null;
		if(this.m_saveToServer) {
			var flushSaveId = this.nextSaveId();
			if(callback != null) {
				flushStatus = new cgs.cache.CacheFlushStatus(flushSaveId,this.m_updateCount,callback);
				this.m_flushStatusMap.set(flushSaveId,flushStatus);
			}
			var serverData = new haxe.ds.StringMap();
			var value;
			var $it0 = this.m_updateMap.keys();
			while( $it0.hasNext() ) {
				var key = $it0.next();
				value = this.m_updateMap.get(key);
				this.m_privateCache.setSaveToSharedObject(key,value,this.m_cacheUUID);
				this.m_userGameData.updateData(key,value);
				var value1 = value;
				this.m_savingData.set(key,value1);
				++this.m_savingDataCount;
				this.m_updateMap.remove(key);
				if(flushStatus != null) flushStatus.addDataKey(key);
				var value2 = value;
				serverData.set(key,value2);
			}
			this.sendSaveDataToServer(serverData,flushSaveId);
			this.m_updateCount = 0;
		}
		var localFlushSuccess = this.m_privateCache.flushPrivateCache();
		if(callback != null) {
			if(flushStatus == null) flushStatus = new cgs.cache.CacheFlushStatus(0,0,callback);
			flushStatus.setLocalFlushStatus(localFlushSuccess);
			if(flushStatus.completed()) flushStatus.makeCompleteCallback();
		}
		return localFlushSuccess;
	}
	,sendSaveDataToServer: function(data,flushSaveId) {
		if(this.m_serverCacheVersion == 2) this.m_serverApi.batchSaveGameData(data,null,flushSaveId,$bind(this,this.handleBatchDataSaved)); else {
			var $it0 = data.keys();
			while( $it0.hasNext() ) {
				var key = $it0.next();
				this.m_serverApi.saveGameData(key,data.get(key),flushSaveId,$bind(this,this.handleDataSaved));
			}
		}
	}
	,handleBatchDataSaved: function(props,failed,saveId) {
		var _g = 0;
		while(_g < props.length) {
			var property = props[_g];
			++_g;
			this.handleDataSaved(property,failed,saveId);
		}
	}
	,handleDataSaved: function(property,failed,saveId) {
		if(!failed) {
			--this.m_savingDataCount;
			this.m_savingData.remove(property);
		}
		if(this.m_flushStatusMap.exists(saveId)) {
			var flushStatus = this.m_flushStatusMap.get(saveId);
			flushStatus.updateDataSaveStatus(property,!failed);
			if(flushStatus.completed()) {
				this.m_flushStatusMap.remove(saveId);
				flushStatus.makeCompleteCallback();
			}
		}
		this.m_privateCache.callSaveCallback(property,failed);
	}
	,nextSaveId: function() {
		return ++this.m_serverSaveIdGen;
	}
	,getSave: function(property) {
		var resultFound = false;
		var result = null;
		if(this.m_saveToServer) {
			if(this.m_updateMap.exists(property)) {
				result = this.m_updateMap.get(property);
				resultFound = true;
			} else if(this.m_userGameData.isServerDataLoaded() && this.m_userGameData.containsData(property)) {
				result = this.m_userGameData.getData(property);
				resultFound = true;
			}
		}
		if(!resultFound) result = this.m_privateCache.getSaveFromSharedObject(property,this.m_cacheUUID);
		return result;
	}
	,initSave: function(property,defaultVal,flush) {
		if(flush == null) flush = true;
		if(!this.saveExists(property)) this.setSave(property,defaultVal,flush);
	}
	,saveExists: function(property) {
		var result = this.m_privateCache.saveExistsInSharedObject(property,this.m_cacheUUID);
		if(!result && this.m_saveToServer) {
			var sharedObjectWorking = this.m_privateCache.getSharedObjectExists();
			result = this.m_updateMap.exists(property) && (sharedObjectWorking || this.m_updateMap.get(property) != null);
			if(!result) result = this.m_userGameData.isServerDataLoaded() && this.m_userGameData.containsData(property) && (sharedObjectWorking || this.m_userGameData.getData(property) != null);
		}
		return result;
	}
	,setSave: function(property,val,flush) {
		if(flush == null) flush = true;
		var result = this.m_privateCache.setSaveToSharedObject(property,val,this.m_cacheUUID);
		if(this.m_saveToServer) {
			if(!this.m_updateMap.exists(property)) this.m_updateCount++;
			var value = val;
			this.m_updateMap.set(property,value);
		}
		if(flush) result = this.flushPlayerCache() && result;
		return result;
	}
	,__class__: cgs.cache._CgsCache.PlayerCache
};
cgs.cache._CgsCache.PrivateCache = function(factory) {
	this.m_factory = factory;
	this.m_serverSaveCallbackMap = new haxe.ds.StringMap();
};
cgs.cache._CgsCache.PrivateCache.__name__ = true;
cgs.cache._CgsCache.PrivateCache.prototype = {
	getSharedObjectExists: function() {
		var result = this.m_sharedObject != null;
		if(!result && this.m_factory != null) try {
			this.m_sharedObject = this.m_factory.createLocalCache("userData");
			result = true;
		} catch( err ) {
			console.log("ERROR: Unable to obtain the Shared Object - aka The Flash Cache");
		}
		return result;
	}
	,getSize: function() {
		if(this.m_sharedObject != null) return this.m_sharedObject.getSize(); else return 0;
	}
	,migrateOldCacheData: function(prefix,defaultUser) {
		if(this.getSharedObjectExists() && defaultUser != null) {
			var oldPropertiesInCache = new Array();
			var _g = 0;
			var _g1 = this.m_sharedObject.getKeys();
			while(_g < _g1.length) {
				var property = _g1[_g];
				++_g;
				if(property != null && property.indexOf(prefix) < 0) oldPropertiesInCache.push(property);
			}
			var propKey;
			while(oldPropertiesInCache.length > 0) {
				propKey = oldPropertiesInCache.pop();
				var value = this.m_sharedObject.getProperty(propKey);
				this.m_sharedObject.deleteProperty(propKey);
				defaultUser.setSave(propKey,value,false);
			}
			defaultUser.flushPlayerCache();
		}
	}
	,clearSharedObject: function() {
		if(this.getSharedObjectExists()) this.m_sharedObject.clear();
	}
	,clearSharedObjectForUser: function(userID) {
		if(this.getSharedObjectExists() && this.m_sharedObject.containsProperty(userID)) {
			this.m_sharedObject.deleteProperty(userID);
			try {
				this.m_sharedObject.flush();
			} catch( err ) {
				console.log("ERROR: Local flush failed! " + Std.string(err.message));
			}
		}
	}
	,deleteSaveFromSharedObject: function(property,userID) {
		if(this.getSharedObjectExists() && this.saveExistsInSharedObject(property,userID)) {
			var userCache = this.m_sharedObject.getProperty(userID);
			Reflect.deleteField(userCache,property);
			this.m_sharedObject.setProperty(userID,userCache);
			try {
				this.m_sharedObject.flush();
			} catch( err ) {
				console.log("ERROR: Local flush failed! " + Std.string(err.message));
			}
		}
	}
	,flushPrivateCache: function() {
		var result = true;
		try {
			this.m_sharedObject.flush();
		} catch( err ) {
			console.log("ERROR: Local flush failed! " + Std.string(err.message));
			result = false;
		}
		return result;
	}
	,callSaveCallback: function(property,failed) {
		if(this.m_serverSaveCallbackMap.exists(property)) {
			var callback = this.m_serverSaveCallbackMap.get(property);
			if(callback != null) callback(property,failed);
		}
	}
	,registerSaveCallback: function(property,callback) {
		var value = callback;
		this.m_serverSaveCallbackMap.set(property,value);
	}
	,unregisterSaveCallback: function(property) {
		if(this.m_serverSaveCallbackMap.exists(property)) this.m_serverSaveCallbackMap.remove(property);
	}
	,getSaveFromSharedObject: function(property,userID) {
		var result = null;
		if(this.getSharedObjectExists()) {
			var userCache = this.m_sharedObject.getProperty(userID);
			if(userCache != null) result = Reflect.field(userCache,property);
		}
		return result;
	}
	,saveExistsInSharedObject: function(property,userID) {
		var result = false;
		if(this.getSharedObjectExists()) {
			var userCache = this.m_sharedObject.getProperty(userID);
			result = userCache != null && userCache.hasOwnProperty(property);
		}
		return result;
	}
	,setSaveToSharedObject: function(property,val,userID) {
		var result = false;
		if(this.getSharedObjectExists()) {
			var userCache = this.m_sharedObject.getProperty(userID);
			if(userCache == null) userCache = { };
			userCache[property] = val;
			this.m_sharedObject.setProperty(userID,userCache);
			result = true;
		}
		return result;
	}
	,__class__: cgs.cache._CgsCache.PrivateCache
};
cgs.cache.ICgsCacheFactory = function() { };
cgs.cache.ICgsCacheFactory.__name__ = true;
cgs.cache.ICgsCacheFactory.prototype = {
	__class__: cgs.cache.ICgsCacheFactory
};
cgs.cache.ICgsUserCache = function() { };
cgs.cache.ICgsUserCache.__name__ = true;
cgs.cache.ICgsUserCache.prototype = {
	__class__: cgs.cache.ICgsUserCache
};
cgs.cache.ILocalCache = function() { };
cgs.cache.ILocalCache.__name__ = true;
cgs.cache.ILocalCache.prototype = {
	__class__: cgs.cache.ILocalCache
};
cgs.cache.ILocalCacheFactory = function() { };
cgs.cache.ILocalCacheFactory.__name__ = true;
cgs.cache.ILocalCacheFactory.prototype = {
	__class__: cgs.cache.ILocalCacheFactory
};
cgs.homeplays = {};
cgs.homeplays.data = {};
cgs.homeplays.data.HomeplayData = function() {
	this._levelCount = 0;
	this._questIds = new Array();
	this._conceptKeys = new Array();
	this._levelCount = 0;
};
cgs.homeplays.data.HomeplayData.__name__ = true;
cgs.homeplays.data.HomeplayData.prototype = {
	getId: function() {
		return this._id;
	}
	,setId: function(value) {
		this._id = value;
	}
	,getLevelCount: function() {
		return this._levelCount;
	}
	,setLevelCount: function(value) {
		this._levelCount = value;
	}
	,getName: function() {
		return this._name;
	}
	,setName: function(value) {
		this._name = value;
	}
	,addQuestId: function(id) {
		this._questIds.push(id);
	}
	,setQuestIds: function(ids) {
		this._questIds = ids;
	}
	,getQuestIds: function() {
		return this._questIds.slice();
	}
	,addConceptKey: function(key) {
		this._conceptKeys.push(key);
	}
	,setConceptKeys: function(keys) {
		this._conceptKeys = keys;
	}
	,getConceptKeys: function() {
		return this._conceptKeys.slice();
	}
	,getRequiredQuestCount: function() {
		var returnInt = 0;
		if(this._levelCount > 0) returnInt = this._levelCount; else returnInt = this._questIds.length;
		return returnInt;
	}
	,getQuestCount: function() {
		return this._questIds.length;
	}
	,__class__: cgs.homeplays.data.HomeplayData
};
cgs.homeplays.data.UserAssignment = function() {
	this._completedQuestIds = [];
};
cgs.homeplays.data.UserAssignment.__name__ = true;
cgs.homeplays.data.UserAssignment.prototype = {
	questCompleted: function(questId) {
		var itemIdx = Lambda.indexOf(this._completedQuestIds,questId);
		if(itemIdx < 0) this._completedQuestIds.push(questId);
	}
	,getLabel: function() {
		return this._name;
	}
	,getName: function() {
		return this._name;
	}
	,setName: function(value) {
		this._name = value;
	}
	,getStartDate: function() {
		return this._startDate;
	}
	,setStartDate: function(value) {
		this._startDate = value;
	}
	,getValidDueDate: function() {
		return !Math.isNaN(this._dueDate) && this._dueDate >= 0;
	}
	,getDueDate: function() {
		return this._dueDate;
	}
	,setDueDate: function(value) {
		this._dueDate = value;
	}
	,setReplayAllowed: function(value) {
		this._replayAllowed = value;
	}
	,getReplayAllowed: function() {
		return this._replayAllowed;
	}
	,getHomeplayData: function() {
		return this._homeplayData;
	}
	,setHomeplayData: function(value) {
		this._homeplayData = value;
	}
	,getCompletedQuestIds: function() {
		return this._completedQuestIds.slice();
	}
	,getCompletedQuestCount: function() {
		return this._completedQuestIds.length;
	}
	,getRequiredQuestCount: function() {
		return this._homeplayData.getRequiredQuestCount();
	}
	,isQuestCompleted: function(questId) {
		return Lambda.indexOf(this._completedQuestIds,"" + questId) >= 0;
	}
	,getAssignmentQuests: function() {
		return this._homeplayData.getQuestIds();
	}
	,getAssignmentConcepts: function() {
		return this._homeplayData.getConceptKeys();
	}
	,parseJsonData: function(data) {
	}
	,__class__: cgs.homeplays.data.UserAssignment
};
cgs.homeplays.data.UserHomeplaysData = function() {
	this._assignments = new Array();
};
cgs.homeplays.data.UserHomeplaysData.__name__ = true;
cgs.homeplays.data.UserHomeplaysData.prototype = {
	getActiveAssignmentCount: function() {
		return this._assignments.length;
	}
	,getActiveAssignmentAt: function(idx) {
		return this._assignments[idx];
	}
	,getAssignmentById: function(assignmentId) {
		var bFound = false;
		var i = 0;
		var returnAssignment = null;
		while(i < this._assignments.length && !bFound) if(this._assignments[i].getHomeplayData().getId() == assignmentId) bFound = true; else i++;
		if(bFound) returnAssignment = this._assignments[i];
		return returnAssignment;
	}
	,assignmentQuestCompleted: function(assignmentId,dqid) {
		var assignment = this.getAssignmentById(assignmentId);
		if(assignment != null) assignment.questCompleted(dqid);
	}
	,addAssignment: function(assignment) {
		this._assignments.push(assignment);
	}
	,getActiveAssignments: function() {
		return this._assignments.slice();
	}
	,__class__: cgs.homeplays.data.UserHomeplaysData
};
cgs.http = {};
cgs.http.IHttpListener = function() { };
cgs.http.IHttpListener.__name__ = true;
cgs.http.IHttpListener.prototype = {
	__class__: cgs.http.IHttpListener
};
cgs.http.IHttpLoader = $hx_exports.cgs.http.IHttpLoader = function() { };
cgs.http.IHttpLoader.__name__ = true;
cgs.http.IHttpLoader.prototype = {
	__class__: cgs.http.IHttpLoader
};
cgs.http.IHttpLoaderFactory = $hx_exports.cgs.http.IHttpLoaderFactory = function() { };
cgs.http.IHttpLoaderFactory.__name__ = true;
cgs.http.IHttpLoaderFactory.prototype = {
	__class__: cgs.http.IHttpLoaderFactory
};
cgs.http.IUrlLoader = function() { };
cgs.http.IUrlLoader.__name__ = true;
cgs.http.IUrlLoader.prototype = {
	__class__: cgs.http.IUrlLoader
};
cgs.http.IUrlLoaderListener = function() { };
cgs.http.IUrlLoaderListener.__name__ = true;
cgs.http.IUrlRequest = function() { };
cgs.http.IUrlRequest.__name__ = true;
cgs.http.IUrlRequest.prototype = {
	__class__: cgs.http.IUrlRequest
};
cgs.http.UrlLoader = $hx_exports.cgs.http.UrlLoader = function(loaderFactory) {
	this.loaderFactory = loaderFactory;
};
cgs.http.UrlLoader.__name__ = true;
cgs.http.UrlLoader.__interfaces__ = [cgs.http.IUrlLoader,cgs.http.IHttpListener];
cgs.http.UrlLoader.prototype = {
	loadRequest: function(request) {
		var loader = this.loaderFactory.createHttpLoader(request);
		loader.setListener(this);
		request.setSendTime(haxe.Timer.stamp());
		loader.load();
	}
	,closeRequest: function(request) {
		return null;
	}
	,setOnComplete: function(complete) {
		this.completeCallback = complete;
	}
	,getOnComplete: function() {
		return this.completeCallback;
	}
	,setOnError: function(error) {
		this.errorCallback = error;
	}
	,getOnError: function() {
		return this.errorCallback;
	}
	,handleComplete: function(loader) {
		if(this.completeCallback != null) this.completeCallback(loader.getRequest(),loader.getResponse());
		if(this.listener != null) this.listener.handleComplete(loader.getRequest(),loader.getResponse());
	}
	,handleError: function(loader) {
		if(this.errorCallback != null) this.errorCallback(loader.getRequest(),loader.getResponse());
		if(this.listener != null) this.listener.handleError(loader.getRequest(),loader.getResponse());
	}
	,handleHttpLoadComplete: function(loader) {
		loader.getResponse().setCompleteTime(haxe.Timer.stamp());
		this.handleComplete(loader);
	}
	,handleHttpLoadError: function(loader) {
		loader.getResponse().setCompleteTime(haxe.Timer.stamp());
		this.handleError(loader);
	}
	,__class__: cgs.http.UrlLoader
};
cgs.http.UrlLoaderDataFormat = function() { };
cgs.http.UrlLoaderDataFormat.__name__ = true;
cgs.http.UrlRequest = $hx_exports.cgs.http.UrlRequest = function(url,data,callback,method,timeoutSecs) {
	if(timeoutSecs == null) timeoutSecs = 0;
	if(method == null) method = "GET";
	this._dataFormat = "TEXT";
	this._failureCount = 0;
	this._maxFailures = 0;
	this._id = 0;
	this._url = url;
	this._method = method;
	this._callback = callback;
	this._timeoutSecs = timeoutSecs;
	this._dependencyManager = new cgs.http.requests.RequestDependencyManager();
	this._readyHandlers = new Array();
	this._changeCallbacks = new Array();
	this._queryParams = new cgs.http.UrlVariables();
	this.setData(data);
};
cgs.http.UrlRequest.__name__ = true;
cgs.http.UrlRequest.__interfaces__ = [cgs.http.IUrlRequest];
cgs.http.UrlRequest.prototype = {
	getUrl: function() {
		return this._url;
	}
	,setUrl: function(value) {
		this._url = value;
	}
	,isFailure: function(response) {
		return false;
	}
	,setMethod: function(value) {
		this._method = value;
	}
	,getMethod: function() {
		return this._method;
	}
	,isPOST: function() {
		if(this._method == null) return false;
		return this._method.toUpperCase() == cgs.http.UrlRequestMethod.POST;
	}
	,isGET: function() {
		if(this._method == null) return true;
		return this._method.toUpperCase() == cgs.http.UrlRequestMethod.GET;
	}
	,getId: function() {
		return this._id;
	}
	,setId: function(value) {
		this._id = value;
	}
	,addParameter: function(key,value) {
		this._queryParams.addParameter(key,value);
	}
	,getParameters: function() {
		return this._queryParams.getParameters();
	}
	,setParameter: function(key,value) {
		this._queryParams.setParameter(key,value);
	}
	,addParameters: function(params) {
		this._queryParams.addParameters(params);
	}
	,setParameters: function(params) {
		this._queryParams.setParameters(params);
	}
	,getUrlVariables: function() {
		return this._queryParams;
	}
	,setData: function(value) {
		this._data = value;
	}
	,getData: function() {
		return this._data;
	}
	,setDataFormat: function(value) {
		this._dataFormat = value;
	}
	,getDataFormat: function() {
		return this._dataFormat;
	}
	,setCallback: function(value) {
		console.log("Setting callback throught setter.");
		this._callback = value;
	}
	,getCallback: function() {
		return this._callback;
	}
	,setTimeout: function(seconds) {
		this._timeoutSecs = seconds;
	}
	,getTimeout: function() {
		return this._timeoutSecs;
	}
	,setSubmitTime: function(timeSecs) {
		this._submitTime = timeSecs;
	}
	,getSubmitTime: function() {
		return this._submitTime;
	}
	,setSendTime: function(timeSecs) {
		this._sendTime = timeSecs;
	}
	,setCompleteTime: function(timeSecs) {
		this._completeTime = timeSecs;
	}
	,getFullDuration: function() {
		if(this._completeTime == 0) return 0;
		return this._completeTime - this._submitTime;
	}
	,getDuration: function() {
		if(this._completeTime == 0) return 0;
		return this._completeTime - this._sendTime;
	}
	,getFailureCount: function() {
		return this._failureCount;
	}
	,failed: function() {
		++this._failureCount;
	}
	,setMaxFailures: function(value) {
		this._maxFailures = value;
	}
	,getMaxFailuresExceeded: function() {
		if(this._maxFailures <= 0) return false;
		return this._failureCount >= this._maxFailures;
	}
	,setResponseStatus: function(status) {
		this._responseStatus = status;
	}
	,getResponseStatus: function() {
		if(this._responseStatus == null) this._responseStatus = new cgs.http.responses.ResponseStatus();
		this._responseStatus.setRequest(this);
		return this._responseStatus;
	}
	,addDependencyChangeListener: function(listener) {
		if(listener == null) return;
		this._changeCallbacks.push(listener);
	}
	,isReady: function(completedRequestIds) {
		return this._dependencyManager.isReady(completedRequestIds);
	}
	,getDependencyFailure: function() {
		return this._dependencyManager.cancelRequest();
	}
	,addDependencyById: function(id,requireSuccess) {
		if(requireSuccess == null) requireSuccess = false;
		this._dependencyManager.addRequestDependencyById(id,requireSuccess);
	}
	,addRequestDependency: function(context) {
		this._dependencyManager.addRequestDependency(context);
	}
	,addDependency: function(depen) {
		depen.setChangeListener($bind(this,this.handleDependencyChange));
		this._dependencyManager.addDependency(depen);
	}
	,handleDependencyChange: function() {
		var _g = 0;
		var _g1 = this._changeCallbacks;
		while(_g < _g1.length) {
			var callback = _g1[_g];
			++_g;
			callback(this);
		}
	}
	,handleReady: function() {
		var _g = 0;
		var _g1 = this._readyHandlers;
		while(_g < _g1.length) {
			var handler = _g1[_g];
			++_g;
			handler(this);
		}
	}
	,addReadyHandler: function(handler) {
		this._readyHandlers.push(handler);
	}
	,handleCancel: function() {
		if(this._cancelHandler != null) this._cancelHandler(this);
	}
	,setCancelHandler: function(handler) {
		this._cancelHandler = handler;
	}
	,getObjectData: function() {
		var data = { };
		this.writeObjectData(data);
		return data;
	}
	,writeObjectData: function(data) {
	}
	,parseDataObject: function(data) {
	}
	,__class__: cgs.http.UrlRequest
};
cgs.http.UrlRequestListener = function() { };
cgs.http.UrlRequestListener.__name__ = true;
cgs.http.UrlRequestListener.prototype = {
	__class__: cgs.http.UrlRequestListener
};
cgs.http.UrlRequestMethod = function() { };
cgs.http.UrlRequestMethod.__name__ = true;
cgs.http.UrlVariables = function(source) {
	this.params = new haxe.ds.StringMap();
	this.decode(source);
};
cgs.http.UrlVariables.__name__ = true;
cgs.http.UrlVariables.prototype = {
	containsParameter: function(key) {
		return this.params.exists(key);
	}
	,setParameter: function(key,value) {
		var value1 = value;
		this.params.set(key,value1);
	}
	,setParameters: function(params) {
		params = new haxe.ds.StringMap();
		if(params == null) return;
		this.addParameters(params);
	}
	,addParameters: function(params) {
		if(params == null) return;
		var $it0 = params.keys();
		while( $it0.hasNext() ) {
			var key = $it0.next();
			this.setParameter(key,params.get(key));
		}
	}
	,getParameters: function() {
		return this.params;
	}
	,getParameter: function(key) {
		return this.params.get(key);
	}
	,getParameterKeys: function() {
		return this.params.keys();
	}
	,decode: function(source) {
		if(source == null) return;
		var parts = source.split("&");
		var currValueParts;
		var _g = 0;
		while(_g < parts.length) {
			var currPart = parts[_g];
			++_g;
			currValueParts = currPart.split("=");
			if(currValueParts.length > 1) this.params.set(currValueParts[0],currValueParts[1]);
		}
	}
	,toString: function() {
		var queryString = "";
		var currValue;
		var $it0 = this.params.keys();
		while( $it0.hasNext() ) {
			var key = $it0.next();
			currValue = this.params.get(key);
			currValue = encodeURIComponent(currValue);
			if(queryString.length > 0) queryString += "&";
			queryString += key + "=" + currValue;
		}
		return queryString;
	}
	,__class__: cgs.http.UrlVariables
};
cgs.http.requests = {};
cgs.http.requests.FailedUrlRequest = function(request) {
	this._failures = 0;
	this._request = request;
};
cgs.http.requests.FailedUrlRequest.__name__ = true;
cgs.http.requests.FailedUrlRequest.__interfaces__ = [cgs.http.IUrlRequest];
cgs.http.requests.FailedUrlRequest.prototype = {
	setParameter: function(key,value) {
		if(this._request == null) return;
		this._request.setParameter(key,value);
	}
	,getParameters: function() {
		return this._request.getParameters();
	}
	,addParameters: function(params) {
		this._request.addParameters(params);
	}
	,setParameters: function(params) {
		this._request.setParameters(params);
	}
	,getUrlVariables: function() {
		return this._request.getUrlVariables();
	}
	,setData: function(value) {
		this._request.setData(value);
	}
	,getData: function() {
		return this._request.getData();
	}
	,isFailure: function(response) {
		if(this._request == null) return false;
		return this._request.isFailure(response);
	}
	,getUrl: function() {
		return this._request.getUrl();
	}
	,complete: function() {
		this._complete = true;
	}
	,getRequest: function() {
		return this._request;
	}
	,getRetrying: function() {
		return this._retrying;
	}
	,setRetrying: function(value) {
		this._retrying = value;
	}
	,getFailCount: function() {
		return this._failures;
	}
	,setNextRetryTime: function(time) {
		this._remainingTime = time;
	}
	,updateTimeRemaining: function(delta) {
		this._remainingTime -= delta;
		return this._remainingTime <= 0;
	}
	,getRetryRequired: function() {
		return !this._retrying && this._remainingTime <= 0;
	}
	,getCallback: function() {
		return $bind(this,this.handleFailedRequestComplete);
	}
	,handleFailedRequestComplete: function(response) {
		var origCallback = this._request.getCallback();
		if(origCallback != null) origCallback(this._request.getResponseStatus());
	}
	,getResponseStatus: function() {
		if(this._complete) return this._request.getResponseStatus(); else {
			if(this._response == null) this._response = new cgs.http.responses.ResponseStatus();
			this._response.setRequest(this);
			return this._response;
		}
	}
	,getSubmitTime: function() {
		return this._submitTime;
	}
	,setSubmitTime: function(timeSecs) {
		if(this._submitTime > 0) return;
		this._submitTime = timeSecs;
	}
	,setSendTime: function(timeSecs) {
		if(this._sendTime > 0) return;
		this._sendTime = timeSecs;
	}
	,setCompleteTime: function(timeSecs) {
		this._completeTime = timeSecs;
		this._request.setCompleteTime(timeSecs);
	}
	,getDuration: function() {
		return 0;
	}
	,getFullDuration: function() {
		return 0;
	}
	,setId: function(value) {
	}
	,getId: function() {
		return this._request.getId();
	}
	,getDataFormat: function() {
		return this._request.getDataFormat();
	}
	,setCallback: function(value) {
	}
	,setMethod: function(value) {
	}
	,getMethod: function() {
		return this._request.getMethod();
	}
	,isPOST: function() {
		return this._request.isPOST();
	}
	,isGET: function() {
		return this._request.isGET();
	}
	,setResponseStatus: function(value) {
	}
	,getTimeout: function() {
		return this._request.getTimeout();
	}
	,setTimeout: function(seconds) {
	}
	,setTimeoutSeconds: function(seconds) {
	}
	,getFailureCount: function() {
		return this._request.getFailureCount();
	}
	,failed: function() {
		this._request.failed();
		++this._failures;
		this._retrying = false;
	}
	,setMaxFailures: function(value) {
	}
	,getMaxFailuresExceeded: function() {
		return this._request.getMaxFailuresExceeded();
	}
	,addDependencyChangeListener: function(listener) {
	}
	,isReady: function(completedRequestIds) {
		return this._request.isReady(completedRequestIds);
	}
	,getDependencyFailure: function() {
		return this._request.getDependencyFailure();
	}
	,addDependencyById: function(id,requireSuccess) {
		if(requireSuccess == null) requireSuccess = false;
	}
	,addRequestDependency: function(context) {
	}
	,addDependency: function(depen) {
	}
	,handleReady: function() {
	}
	,addReadyHandler: function(handler) {
	}
	,handleCancel: function() {
	}
	,setCancelHandler: function(handler) {
	}
	,getObjectData: function() {
		return null;
	}
	,parseDataObject: function(data) {
	}
	,__class__: cgs.http.requests.FailedUrlRequest
};
cgs.http.requests.IRequestDependency = function() { };
cgs.http.requests.IRequestDependency.__name__ = true;
cgs.http.requests.IRequestDependency.prototype = {
	__class__: cgs.http.requests.IRequestDependency
};
cgs.http.requests.IRequestFailureHandler = function() { };
cgs.http.requests.IRequestFailureHandler.__name__ = true;
cgs.http.requests.IRequestFailureHandler.prototype = {
	__class__: cgs.http.requests.IRequestFailureHandler
};
cgs.http.requests.IUrlRequestHandler = function() { };
cgs.http.requests.IUrlRequestHandler.__name__ = true;
cgs.http.requests.IUrlRequestHandler.prototype = {
	__class__: cgs.http.requests.IUrlRequestHandler
};
cgs.http.requests.RequestDependency = function(id,requireSuccess) {
	if(requireSuccess == null) requireSuccess = false;
	if(id == null) id = 0;
	this._requestId = 0;
	this._requestId = id;
	this._successRequired = requireSuccess;
};
cgs.http.requests.RequestDependency.__name__ = true;
cgs.http.requests.RequestDependency.prototype = {
	setRequestId: function(value) {
		this._requestId = value;
	}
	,getRequestId: function() {
		return this._requestId;
	}
	,isSuccessRequired: function() {
		return this._successRequired;
	}
	,updateRequestId: function(id) {
		this._requestId = id;
	}
	,__class__: cgs.http.requests.RequestDependency
};
cgs.http.requests.RequestDependencyManager = function() {
	this._requestDependencies = new Array();
	this._dependencies = new Array();
};
cgs.http.requests.RequestDependencyManager.__name__ = true;
cgs.http.requests.RequestDependencyManager.prototype = {
	cancelRequest: function() {
		return this._cancelRequest;
	}
	,isReady: function(completeRequestIds) {
		var requestSuccess;
		var _g = 0;
		var _g1 = this._requestDependencies;
		while(_g < _g1.length) {
			var context = _g1[_g];
			++_g;
			if(!(function($this) {
				var $r;
				var key = context.getRequestId();
				$r = completeRequestIds.exists(key);
				return $r;
			}(this))) return false; else if(context.isSuccessRequired()) {
				var key1 = context.getRequestId();
				requestSuccess = completeRequestIds.get(key1);
				if(!requestSuccess) {
					this._cancelRequest = true;
					return false;
				}
			}
		}
		var _g2 = 0;
		var _g11 = this._dependencies;
		while(_g2 < _g11.length) {
			var depen = _g11[_g2];
			++_g2;
			if(!depen.isReady()) return false;
		}
		return true;
	}
	,addDependency: function(depen) {
		this._dependencies.push(depen);
	}
	,addRequestDependencyById: function(id,requireSuccess) {
		if(requireSuccess == null) requireSuccess = false;
		if(id <= 0) return;
		this.addRequestDependency(new cgs.http.requests.RequestDependency(id,requireSuccess));
	}
	,addRequestDependency: function(context) {
		if(context == null) return;
		this._requestDependencies.push(context);
	}
	,__class__: cgs.http.requests.RequestDependencyManager
};
cgs.http.requests.RequestFailureHandler = $hx_exports.cgs.http.requests.RequestFailureHandler = function() {
	this._backoffFactor = 2;
	this._jitter = 0.5;
	this._startBackoffTime = 1;
	this._failedRequests = new Array();
	this._resendingRequests = new haxe.ds.ObjectMap();
};
cgs.http.requests.RequestFailureHandler.__name__ = true;
cgs.http.requests.RequestFailureHandler.__interfaces__ = [cgs.http.requests.IRequestFailureHandler];
cgs.http.requests.RequestFailureHandler.prototype = {
	setUrlRequestHandler: function(value) {
		this._requestHandler = value;
	}
	,setRetryParameters: function(backOffStartTime,backOffFactor) {
		this._startBackoffTime = backOffStartTime;
		this._backoffFactor = backOffFactor;
	}
	,getFailedRequestCount: function() {
		return this._failedRequests.length;
	}
	,handleFailedRequest: function(request) {
		this.startRetryTimer();
		var failedRequest = this._resendingRequests.h[request.__id__];
		if(failedRequest != null) {
			failedRequest = this._resendingRequests.h[request.__id__];
			this._resendingRequests.remove(request);
			var key = failedRequest.getRequest();
			this._resendingRequests.remove(key);
		} else {
			failedRequest = new cgs.http.requests.FailedUrlRequest(request);
			this._failedRequests.push(failedRequest);
		}
		failedRequest.setNextRetryTime(this.getRetryTime(failedRequest.getFailureCount()));
	}
	,handleRequestComplete: function(request) {
		var failedRequest = this._resendingRequests.h[request.__id__];
		if(failedRequest == null) return;
		failedRequest.complete();
		this._resendingRequests.remove(request);
		var key = failedRequest.getRequest();
		this._resendingRequests.remove(key);
		var removeIdx = Lambda.indexOf(this._failedRequests,failedRequest);
		if(removeIdx >= 0) this._failedRequests.splice(removeIdx,1);
		if(this._failedRequests.length == 0) this.stopRetryTimer();
	}
	,getRetryTime: function(failCount) {
		var multiplier;
		if(failCount == 0) multiplier = 1; else multiplier = Math.pow(failCount,this._backoffFactor);
		var retryTime = multiplier * this._startBackoffTime;
		var max = this._jitter * this._startBackoffTime;
		var min = -max;
		var jitter = this.getRandomRange(min,max);
		retryTime += jitter;
		return retryTime;
	}
	,getRandomRange: function(min,max) {
		return min + Math.random() * (max - min);
	}
	,handleRetryTimer: function() {
		var currTime = haxe.Timer.stamp();
		var timeDiff = currTime - this._prevTime;
		this._prevTime = currTime;
		var _g = 0;
		var _g1 = this._failedRequests;
		while(_g < _g1.length) {
			var failRequest = _g1[_g];
			++_g;
			if(failRequest.getRetrying()) continue;
			if(failRequest.updateTimeRemaining(timeDiff)) {
				failRequest.setRetrying(true);
				this._resendingRequests.set(failRequest,failRequest);
				var key = failRequest.getRequest();
				this._resendingRequests.set(key,failRequest);
				this._requestHandler.sendUrlRequest(failRequest);
			}
		}
	}
	,startRetryTimer: function() {
		if(this._retryTimer == null) {
			this._prevTime = haxe.Timer.stamp();
			this._retryTimer = new haxe.Timer(100);
			this._retryTimer.run = $bind(this,this.handleRetryTimer);
		}
	}
	,stopRetryTimer: function() {
		if(this._retryTimer == null) return;
		this._retryTimer.stop();
		this._retryTimer = null;
	}
	,__class__: cgs.http.requests.RequestFailureHandler
};
cgs.http.requests.RequestPropertyDependency = function(propertyKey) {
	this._propertyKey = propertyKey;
};
cgs.http.requests.RequestPropertyDependency.__name__ = true;
cgs.http.requests.RequestPropertyDependency.__interfaces__ = [cgs.http.requests.IRequestDependency];
cgs.http.requests.RequestPropertyDependency.prototype = {
	setChangeListener: function(listener) {
		this._changeListener = listener;
	}
	,isReady: function() {
		return this._valueSet;
	}
	,getKey: function() {
		return this._propertyKey;
	}
	,setValue: function(val) {
		this._valueSet = true;
		this._value = val;
		if(this._changeListener != null) this._changeListener();
	}
	,__class__: cgs.http.requests.RequestPropertyDependency
};
cgs.http.requests.UrlRequestHandler = $hx_exports.cgs.http.requests.UrlRequestHandler = function(loader,failedRequestHandler) {
	this._timeoutRequestCount = 0;
	this._timerResolution = 250;
	this._requestId = 0;
	this._timeoutRequests = new haxe.ds.ObjectMap();
	this._waitingRequests = new Array();
	this._cancelRequests = new Array();
	this._completeRequestIdsSet = new haxe.ds.IntMap();
	this._delayedRequests = new Array();
	this._failedRequests = new Array();
	this._pendingRequests = new haxe.ds.ObjectMap();
	this._failedRequestHandler = failedRequestHandler;
	if(this._failedRequestHandler != null) this._failedRequestHandler.setUrlRequestHandler(this);
	this.setUrlLoader(loader);
};
cgs.http.requests.UrlRequestHandler.__name__ = true;
cgs.http.requests.UrlRequestHandler.__interfaces__ = [cgs.http.requests.IUrlRequestHandler];
cgs.http.requests.UrlRequestHandler.prototype = {
	setRequestCompleted: function(id) {
		this._completeRequestIdsSet.set(id,true);
	}
	,terminateNextRequest: function() {
		this._terminateRequest = true;
	}
	,setDelayRequestListener: function(listener) {
		this._delayRequestListener = listener;
	}
	,setUrlLoader: function(loader) {
		this._loader = loader;
		if(this._loader == null) return;
		this._loaderCompleteCallback = this._loader.getOnComplete();
		this._loaderErrorCallback = this._loader.getOnError();
		this._loader.setOnComplete($bind(this,this.handleRequestComplete));
		this._loader.setOnError($bind(this,this.handleRequestError));
	}
	,getUrlLoader: function() {
		return this._loader;
	}
	,setFailureHandler: function(handler) {
		this._failedRequestHandler = handler;
	}
	,sendUrlRequest: function(request) {
		request.setSubmitTime(haxe.Timer.stamp());
		var id = request.getId();
		if(id <= 0) {
			id = this.nextRequestId();
			request.setId(id);
		}
		if(this._terminateRequest) {
			request.setParameter("exit",1);
			this._terminateRequest = false;
		}
		if(this.getDelayRequests()) this._delayedRequests.push(request); else if(!this.isRequestReady(request)) {
			request.addDependencyChangeListener($bind(this,this.handleRequestDependencyChange));
			this._waitingRequests.push(request);
		} else this.handleSendRequest(request);
		this.handleWaitingRequests();
		return id;
	}
	,handleRequestDependencyChange: function(request) {
		this.handleWaitingRequests();
	}
	,handleSendRequest: function(request) {
		if(request.getTimeout() > 0) {
			this.startTimer();
			this._timeoutRequests.set(request,true);
		}
		if(!js.Boot.__instanceof(request,cgs.http.requests.FailedUrlRequest)) this._pendingRequests.set(request,1);
		this._loader.loadRequest(request);
	}
	,isRequestReady: function(request) {
		var requestReady = request.isReady(this._completeRequestIdsSet);
		if(!requestReady && request.getDependencyFailure()) {
			console.log("Request being canceled");
			this._cancelRequests.push(request);
		}
		return requestReady;
	}
	,isRequestCanceled: function(request) {
		var idx = this._cancelRequests.length - 1;
		while(idx >= 0) {
			if(request == this._cancelRequests[idx]) return true;
			--idx;
		}
		return false;
	}
	,handleWaitingRequests: function() {
		if(this._waitingRequests.length == 0 || this._handlingWaitingRequests) return;
		this._handlingWaitingRequests = true;
		var remainingRequests = new Array();
		var _g = 0;
		var _g1 = this._waitingRequests;
		while(_g < _g1.length) {
			var request = _g1[_g];
			++_g;
			if(this.isRequestReady(request)) {
				request.handleReady();
				this.sendUrlRequest(request);
			} else if(!this.isRequestCanceled(request)) remainingRequests.push(request);
		}
		this._waitingRequests = remainingRequests;
		this.handleCanceledRequests();
		this._handlingWaitingRequests = false;
	}
	,handleCanceledRequests: function() {
		var _g = 0;
		var _g1 = this._cancelRequests;
		while(_g < _g1.length) {
			var request = _g1[_g];
			++_g;
			this.handleRequestCanceled(request);
		}
		this._cancelRequests = new Array();
	}
	,handleDelayedRequests: function() {
		if(this.getDelayRequests()) return;
		var _g = 0;
		var _g1 = this._delayedRequests;
		while(_g < _g1.length) {
			var request = _g1[_g];
			++_g;
			this.sendUrlRequest(request);
		}
		this._delayedRequests = new Array();
	}
	,getDelayRequests: function() {
		if(this._delayRequestListener == null) return false;
		return this._delayRequestListener();
	}
	,nextRequestId: function() {
		return ++this._requestId;
	}
	,handleRequestCanceled: function(request) {
		var response = this._loader.closeRequest(request);
		request.handleCancel();
		if(response != null) response.cancel();
		this.handleRequestComplete(request,response);
	}
	,handleRequestComplete: function(request,response) {
		if(request.getFailureCount() > 0) {
			if(this._failedRequestHandler != null) this._failedRequestHandler.handleRequestComplete(request);
			this._failedRequests.push(request);
		}
		this._pendingRequests.remove(request);
		var responseStatus = request.getResponseStatus();
		responseStatus.setResponse(response);
		var key = request.getId();
		var value;
		if(responseStatus != null) value = responseStatus.success() && !responseStatus.getCanceled(); else value = false;
		this._completeRequestIdsSet.set(key,value);
		var callback = request.getCallback();
		if(callback != null) callback(responseStatus);
		this.handleWaitingRequests();
	}
	,handleRequestError: function(request,response) {
		console.log("Request failed");
		request.failed();
		if(this._failedRequestHandler != null && !request.getMaxFailuresExceeded()) this._failedRequestHandler.handleFailedRequest(request); else {
			request.setCompleteTime(haxe.Timer.stamp());
			this.handleRequestComplete(request,response);
		}
	}
	,startTimer: function() {
		if(this._timer != null) return;
		this._timer = new haxe.Timer(this._timerResolution);
		this._timer.run = $bind(this,this.handleTimer);
	}
	,stopTimer: function() {
		if(this._timer == null) return;
		this._timer.stop();
		this._timer = null;
	}
	,handleTimer: function() {
		this.handleDelayedRequests();
		var remainingRequests = new haxe.ds.ObjectMap();
		var requestCount = 0;
		var currTime = haxe.Timer.stamp();
		var currRequestTime;
		var timeout;
		var $it0 = this._timeoutRequests.keys();
		while( $it0.hasNext() ) {
			var request = $it0.next();
			currRequestTime = request.getSubmitTime();
			timeout = request.getTimeout();
			if(currTime - currRequestTime > timeout) this.handleTimeout(request); else {
				var value = this._timeoutRequests.h[request.__id__];
				remainingRequests.set(request,value);
				++requestCount;
			}
		}
		this._timeoutRequests = remainingRequests;
		this._timeoutRequestCount = requestCount;
		if(!this._timeoutRequests.keys().hasNext()) this.stopTimer();
	}
	,handleTimeout: function(request) {
		var response = this._loader.closeRequest(request);
		var responseStatus = request.getResponseStatus();
		if(responseStatus != null) responseStatus.requestTimedOut();
		this.handleRequestComplete(request,response);
	}
	,getObjectData: function() {
		var logData = { };
		return logData;
	}
	,getRequestsObjectData: function(requests) {
		var requestData;
		var requestsArray = new Array();
		var _g = 0;
		while(_g < requests.length) {
			var request = requests[_g];
			++_g;
		}
		return requestsArray;
	}
	,__class__: cgs.http.requests.UrlRequestHandler
};
cgs.http.responses = {};
cgs.http.responses.Response = $hx_exports.cgs.http.responses.Response = function() {
	this._statusCode = 0;
};
cgs.http.responses.Response.__name__ = true;
cgs.http.responses.Response.prototype = {
	setData: function(value) {
		this._serverSuccess = true;
		this.data = value;
	}
	,getData: function() {
		return this.data;
	}
	,setSendTime: function(value) {
		this.sendTime = value;
	}
	,setCompleteTime: function(value) {
		this.completeTime = value;
	}
	,getCompleteTime: function() {
		return this.completeTime;
	}
	,cancel: function() {
		this._canceled = true;
	}
	,wasCanceled: function() {
		return this._canceled;
	}
	,getSuccess: function() {
		return this._serverSuccess;
	}
	,getStatusCode: function() {
		return this._statusCode;
	}
	,setStatusCode: function(value) {
		this._statusCode = value;
	}
	,setLocalError: function(err) {
		this._localError = err;
		this._serverSuccess = false;
	}
	,getLocalError: function() {
		return this._localError;
	}
	,setIoError: function(evt) {
		this._ioError = evt;
		this._serverSuccess = false;
	}
	,getIoError: function() {
		return this._ioError;
	}
	,setSecurityError: function(evt) {
		this._securityError = evt;
		this._serverSuccess = false;
	}
	,getSecurityError: function() {
		return this._securityError;
	}
	,__class__: cgs.http.responses.Response
};
cgs.http.responses.ResponseStatus = function() {
};
cgs.http.responses.ResponseStatus.__name__ = true;
cgs.http.responses.ResponseStatus.prototype = {
	setResponse: function(value) {
		this._response = value;
		this.handleResponse();
	}
	,handleResponse: function() {
	}
	,requestTimedOut: function() {
		this._timedOut = true;
	}
	,getTimedOut: function() {
		return this._timedOut;
	}
	,getMaxFailuresExceeded: function() {
		if(this._request != null) return this._request.getMaxFailuresExceeded(); else return false;
	}
	,getFailureCount: function() {
		if(this._request != null) return this._request.getFailureCount(); else return 0;
	}
	,setRequest: function(value) {
		this._request = value;
	}
	,getRequest: function() {
		return this._request;
	}
	,getRawData: function() {
		if(this._response != null) return this._response.getData(); else return null;
	}
	,success: function() {
		return this.serverSuccess() && !this.getCanceled();
	}
	,failed: function() {
		return !this.success();
	}
	,requestFailed: function() {
		return !this.serverSuccess();
	}
	,serverSuccess: function() {
		if(this._response != null) return this._response.getSuccess(); else return false;
	}
	,getStatusCode: function() {
		if(this._response != null) return this._response.getStatusCode(); else return 0;
	}
	,getLocalError: function() {
		if(this._response != null) return this._response.getLocalError(); else return null;
	}
	,getIoError: function() {
		if(this._response != null) return this._response.getIoError(); else return null;
	}
	,getSecurityError: function() {
		if(this._response != null) return this._response.getSecurityError(); else return null;
	}
	,getCanceled: function() {
		if(this._response != null) return this._response.wasCanceled(); else return false;
	}
	,__class__: cgs.http.responses.ResponseStatus
};
cgs.logger = {};
cgs.logger.Logger = function() {
};
cgs.logger.Logger.__name__ = true;
cgs.logger.Logger.log = function(message) {
};
cgs.logger.Logger.prototype = {
	__class__: cgs.logger.Logger
};
cgs.login = {};
cgs.login.ILoginHandler = function() { };
cgs.login.ILoginHandler.__name__ = true;
cgs.login.ILoginHandler.prototype = {
	__class__: cgs.login.ILoginHandler
};
cgs.login.ILoginUi = function() { };
cgs.login.ILoginUi.__name__ = true;
cgs.login.ILoginUi.prototype = {
	__class__: cgs.login.ILoginUi
};
cgs.login.LoginController = $hx_exports.cgs.LoginController = function(api,userProps) {
	this.gradeLevel = 0;
	this.showPassword = true;
	this.api = api;
	this.props = userProps;
};
cgs.login.LoginController.__name__ = true;
cgs.login.LoginController.__interfaces__ = [cgs.login.ILoginHandler];
cgs.login.LoginController.prototype = {
	setStudentGradeLevel: function(grade) {
		this.gradeLevel = grade;
	}
	,setTeacherCode: function(code) {
		this.teacherCode = code;
	}
	,isStudentAuthentication: function() {
		return this.teacherCode != null;
	}
	,setShowPassword: function(value) {
		this.showPassword = value;
	}
	,getShowPassword: function() {
		return this.showPassword;
	}
	,authenticateUser: function(dialog,username,password) {
		if(this.authenticating) return false;
		this.authenticating = true;
		this.loginDialog = dialog;
		if(this.user == null || this.teacherCode != null) this.handleInitialUserAuth(username,password); else this.retryUserAuth(username,password);
		return true;
	}
	,handleInitialUserAuth: function(username,password) {
		if(this.teacherCode != null) this.user = this.api.authenticateStudent(this.props,username,this.teacherCode,password,this.gradeLevel,$bind(this,this.handleStudentAuthResponse)); else this.user = this.api.authenticateUser(this.props,username,password,$bind(this,this.handleUserAuthResponse));
	}
	,handleUserAuthResponse: function(response) {
		this.authenticating = false;
		if(this.loginDialog == null) return;
		if(response.success()) this.loginDialog.userAuthenticationSuccess(response); else if(response.userAuthenticationError()) this.loginDialog.showUserAuthenticationError(); else this.loginDialog.showServerErrorMessage();
	}
	,handleStudentAuthResponse: function(response) {
		this.authenticating = false;
		if(this.loginDialog == null) return;
		if((response.userAuthenticationError() || response.failed()) && !response.isStudentSignupLocked()) this.loginDialog.promptStudentCreation(); else this.handleUserAuthResponse(response);
	}
	,retryUserAuth: function(username,password) {
		if(this.user == null) return;
		this.user.retryAuthentication(username,password,$bind(this,this.handleUserAuthResponse));
	}
	,registerUser: function(dialog,username,password) {
		if(this.authenticating) return false;
		this.authenticating = true;
		this.loginDialog = dialog;
		if(this.teacherCode != null) this.api.registerStudent(this.props,username,this.teacherCode,this.gradeLevel,$bind(this,this.handleStudentRegistration)); else this.api.registerUser(this.props,username,password,null,$bind(this,this.handleUserRegistration));
		return true;
	}
	,handleStudentRegistration: function(response) {
		this.handleUserRegistration(response);
	}
	,handleUserRegistration: function(response) {
		this.authenticating = false;
		if(this.loginDialog == null) return;
		if(response.success()) this.loginDialog.userRegistrationSuccess(response); else if(response.userRegistrationError()) this.loginDialog.userRegistrationError(); else this.loginDialog.showServerErrorMessage();
	}
	,__class__: cgs.login.LoginController
};
cgs.login.LoginUiProperties = function(loginCallback,allowLoginCancel,cancelCallback) {
	if(allowLoginCancel == null) allowLoginCancel = true;
	this.allowLoginCancel = true;
	this.passwordSameAsUsername = false;
	this.showPasswordField = true;
	this.loginCallback = loginCallback;
	this.allowLoginCancel = allowLoginCancel;
	this.cancelCallback = cancelCallback;
};
cgs.login.LoginUiProperties.__name__ = true;
cgs.login.LoginUiProperties.prototype = {
	setStudentGradeLevel: function(value) {
		this.gradeLevel = value;
	}
	,getStudentGradeLevel: function() {
		return this.gradeLevel;
	}
	,setTeacherCode: function(code) {
		this.teacherCode = code;
	}
	,getTeacherCode: function() {
		return this.teacherCode;
	}
	,setShowPasswordField: function(value) {
		this.showPasswordField = value;
	}
	,getShowPasswordField: function() {
		return this.showPasswordField;
	}
	,setPasswordSameAsUsername: function(value) {
		this.passwordSameAsUsername = value;
	}
	,getPasswordSameAsUsername: function() {
		return this.passwordSameAsUsername;
	}
	,getAllowLoginCancel: function() {
		return this.allowLoginCancel;
	}
	,getLoginCallback: function() {
		return this.loginCallback;
	}
	,getCancelCallback: function() {
		return this.cancelCallback;
	}
	,__class__: cgs.login.LoginUiProperties
};
cgs.server = {};
cgs.server.CGSServerConstants = function() { };
cgs.server.CGSServerConstants.__name__ = true;
cgs.server.CGSServerConstants.GetProxyUrl = function(serverTag,version) {
	if(version == null) version = 1;
	if(serverTag == cgs.server.CGSServerProps.LOCAL_SERVER) return cgs.server.CGSServerConstants.INT_LOCAL_URL + cgs.server.CGSServerConstants.PROXY_URL_PHP;
	return "http://" + cgs.server.CGSServerConstants.GetProxyUrlDomain(serverTag) + cgs.server.CGSServerConstants.GetProxyUrlPath(serverTag,version);
};
cgs.server.CGSServerConstants.GetProxyUrlDomain = function(serverTag) {
	return cgs.server.CGSServerConstants.GetIntegrationUrlBase(serverTag);
};
cgs.server.CGSServerConstants.GetProxyUrlPath = function(serverTag,version) {
	if(version == null) version = 1;
	return cgs.server.CGSServerConstants.AppendVersion(cgs.server.CGSServerConstants.PROXY_URL_PATH,version) + cgs.server.CGSServerConstants.PROXY_URL_PHP;
};
cgs.server.CGSServerConstants.GetBaseUrl = function(serverTag,version) {
	if(version == null) version = 1;
	if(serverTag == cgs.server.CGSServerProps.LOCAL_SERVER) return cgs.server.CGSServerConstants.LOCAL_URL;
	var domain = cgs.server.CGSServerConstants.DEV_URL_DOMAIN;
	if(serverTag == cgs.server.CGSServerProps.PRODUCTION_SERVER) domain = cgs.server.CGSServerConstants.BASE_URL_DOMAIN; else if(serverTag == cgs.server.CGSServerProps.STAGING_SERVER) domain = cgs.server.CGSServerConstants.STAGING_URL_DOMAIN; else if(serverTag == cgs.server.CGSServerProps.STUDY_SERVER) domain = cgs.server.CGSServerConstants.SCHOOLS_BASE_URL; else if(serverTag == cgs.server.CGSServerProps.CUSTOM_SERVER) domain = cgs.server.CGSServerConstants.CUSTOM_BASE_URL;
	var url = "http://" + domain + cgs.server.CGSServerConstants.AppendVersion(cgs.server.CGSServerConstants.BASE_URL_PATH,version);
	return url + cgs.server.CGSServerConstants.BASE_URL_PHP;
};
cgs.server.CGSServerConstants.GetIntegrationUrl = function(serverTag,version) {
	if(version == null) version = 1;
	if(serverTag == cgs.server.CGSServerProps.LOCAL_SERVER) return cgs.server.CGSServerConstants.INT_LOCAL_URL;
	var domain = cgs.server.CGSServerConstants.GetIntegrationUrlBase(serverTag);
	var path = cgs.server.CGSServerConstants.AppendVersion(cgs.server.CGSServerConstants.INT_BASE_URL_PATH,version);
	var url = "http://" + domain + path;
	return url + cgs.server.CGSServerConstants.INT_BASE_URL_PHP;
};
cgs.server.CGSServerConstants.AppendVersion = function(path,version) {
	if(version == 2) path += cgs.server.CGSServerConstants.CURRENT_VERSION; else if(version == cgs.server.CGSServerProps.VERSION1) path += cgs.server.CGSServerConstants.VERSION_1; else if(version == 2) path += cgs.server.CGSServerConstants.VERSION_2; else if(version == cgs.server.CGSServerProps.VERSION_DEV) path += cgs.server.CGSServerConstants.VERSION_0;
	return path;
};
cgs.server.CGSServerConstants.GetIntegrationUrlPath = function(version) {
	return cgs.server.CGSServerConstants.AppendVersion(cgs.server.CGSServerConstants.INT_BASE_URL_PATH,version) + cgs.server.CGSServerConstants.INT_BASE_URL_PHP;
};
cgs.server.CGSServerConstants.GetIntegrationUrlBase = function(serverTag) {
	var domain = cgs.server.CGSServerConstants.INT_DEV_URL_DOMAIN;
	if(serverTag == cgs.server.CGSServerProps.PRODUCTION_SERVER) domain = cgs.server.CGSServerConstants.INT_BASE_URL_DOMAIN; else if(serverTag == cgs.server.CGSServerProps.STAGING_SERVER) domain = cgs.server.CGSServerConstants.INT_STAGING_URL_DOMAIN; else if(serverTag == cgs.server.CGSServerProps.CUSTOM_SERVER) domain = cgs.server.CGSServerConstants.CUSTOM_INTEGRATION_BASE_URL; else if(serverTag == cgs.server.CGSServerProps.STUDY_SERVER) domain = cgs.server.CGSServerConstants.INT_BASE_URL_DOMAIN;
	return domain;
};
cgs.server.CGSServerConstants.GetTimeUrl = function(serverTag,version) {
	if(version == null) version = 1;
	var domain = cgs.server.CGSServerConstants.DEV_TIME_URL_DOMAIN;
	if(serverTag == cgs.server.CGSServerProps.PRODUCTION_SERVER || serverTag == cgs.server.CGSServerProps.STUDY_SERVER) domain = cgs.server.CGSServerConstants.TIME_URL_DOMAIN; else if(serverTag == cgs.server.CGSServerProps.STAGING_SERVER) domain = cgs.server.CGSServerConstants.STAGING_TIME_URL_DOMAIN;
	var url = "http://" + domain + cgs.server.CGSServerConstants.AppendVersion(cgs.server.CGSServerConstants.TIME_URL_PATH,version);
	return url + cgs.server.CGSServerConstants.TIME_URL_PHP;
};
cgs.server.CGSServerConstants.prototype = {
	getGameLoggingURL: function(gameName) {
		return "http://" + gameName + ".ws.centerforgamescience.com/cgs/apps/games/ws/index.php/";
	}
	,__class__: cgs.server.CGSServerConstants
};
cgs.server.CGSServerProps = $hx_exports.cgs.server.CGSServerProps = function(skey,skeyHashType,gameName,gameID,versionID,categoryID,serverTag,serverVersion) {
	if(serverVersion == null) serverVersion = 2;
	this._useIntegrationProxy = false;
	this._proxyCgsRequests = false;
	this._logPriority = 1;
	this._dataLevel = 0;
	this._serverVersion = 0;
	this._pageLoadDetails = null;
	this._pageloadMultiSeqId = -1;
	this._logPageLoad = true;
	this._cacheUid = true;
	this._extAppId = 0;
	this._typeID = -1;
	this._eventID = -1;
	this._sessionID = null;
	this._levelID = -1;
	this._experimentId = -1;
	this._categoryID = -1;
	this._versionID = -1;
	this._gameID = -1;
	this._gameName = null;
	this._skey = null;
	this._skeyHashType = 0;
	this._skey = skey;
	this._skeyHashType = skeyHashType;
	this._gameName = gameName;
	this._gameID = gameID;
	this._versionID = versionID;
	this._categoryID = categoryID;
	this._deployServerTag = serverTag;
	this._serverVersion = serverVersion;
};
cgs.server.CGSServerProps.__name__ = true;
cgs.server.CGSServerProps.prototype = {
	setDataLevel: function(level) {
		this._dataLevel = level;
	}
	,getDataLevel: function() {
		return this._dataLevel;
	}
	,setExperimentId: function(value) {
		this._experimentId = value;
	}
	,getExperimentId: function() {
		return this._experimentId;
	}
	,getServerVersion: function() {
		return this._serverVersion;
	}
	,setPageLoadMultiplayerSequenceId: function(value) {
		this._pageloadMultiSeqId = value;
	}
	,getPageLoadMultiplayerSequenceId: function() {
		return this._pageloadMultiSeqId;
	}
	,setUidValidCallback: function(callback) {
		this._uidLoadedCallback = callback;
	}
	,getUidValidCallback: function() {
		return this._uidLoadedCallback;
	}
	,setForceUid: function(value) {
		this._forceUid = value;
	}
	,getForceUid: function() {
		return this._forceUid;
	}
	,setCacheUid: function(value) {
		this._cacheUid = value;
	}
	,getCacheUid: function() {
		return this._cacheUid;
	}
	,getLogPageLoad: function() {
		return this._logPageLoad;
	}
	,setLogPageLoad: function(b) {
		this._logPageLoad = b;
	}
	,getPageLoadDetails: function() {
		return this._pageLoadDetails;
	}
	,setPageLoadDetails: function(details) {
		this._pageLoadDetails = details;
	}
	,setPageLoadCallback: function(callback) {
		this._pageloadCallback = callback;
	}
	,getPageLoadCallback: function() {
		return this._pageloadCallback;
	}
	,setSaveCacheDataToServer: function(value) {
		this._loadUserData = value;
	}
	,getSaveCacheDataToServer: function() {
		return this._loadUserData;
	}
	,setCgsCache: function(value) {
		this._cgsCache = value;
	}
	,getCgsCache: function() {
		return this._cgsCache;
	}
	,setLoadServerCacheDataByCid: function(value) {
		this._includeServerDataCid = value;
	}
	,getLoadServerCacheDataByCid: function() {
		return this._includeServerDataCid;
	}
	,setCompleteCallback: function(value) {
		this._completeCallback = value;
	}
	,getCompleteCallback: function() {
		return this._completeCallback;
	}
	,getSkey: function() {
		return this._skey;
	}
	,getServerTag: function() {
		return this._deployServerTag;
	}
	,useDevServer: function() {
		return this._deployServerTag == cgs.server.CGSServerProps.DEVELOPMENT_SERVER;
	}
	,getSkeyHashVersion: function() {
		return this._skeyHashType;
	}
	,getGameName: function() {
		return this._gameName;
	}
	,getGameID: function() {
		return this._gameID;
	}
	,getVersionID: function() {
		return this._versionID;
	}
	,getCategoryID: function() {
		return this._categoryID;
	}
	,setLevelID: function(value) {
		this._levelID = value;
	}
	,getLevelID: function() {
		return this._levelID;
	}
	,setSessionID: function(value) {
		this._sessionID = value;
	}
	,getSessionID: function() {
		return this._sessionID;
	}
	,setEventID: function(value) {
		this._eventID = value;
	}
	,getEventID: function() {
		return this._eventID;
	}
	,setTypeID: function(value) {
		this._typeID = value;
	}
	,getTypeID: function() {
		return this._typeID;
	}
	,setExternalAppId: function(value) {
		this._extAppId = value;
	}
	,getExternalAppId: function() {
		return this._extAppId;
	}
	,setCacheActionForLaterCallback: function(callback) {
		this._cacheActionForLaterCallback = callback;
	}
	,getCacheActionForLaterCallback: function() {
		return this._cacheActionForLaterCallback;
	}
	,setLogPriority: function(value) {
		this._logPriority = value;
	}
	,getLogPriority: function() {
		return this._logPriority;
	}
	,setLoggingUrl: function(value) {
		this._serverURL = value;
	}
	,isServerURLValid: function() {
		return this._serverURL != null;
	}
	,getLoggingUrl: function() {
		if(this.isServerURLValid()) return this._serverURL; else return cgs.server.CGSServerConstants.GetBaseUrl(this._deployServerTag,this._serverVersion);
		return cgs.server.CGSServerConstants.DEV_URL;
	}
	,getTimeUrl: function() {
		if(this._timeUrl != null) return this._timeUrl; else return cgs.server.CGSServerConstants.GetTimeUrl(this._deployServerTag,this._serverVersion);
	}
	,setTimeUrl: function(url) {
		this._timeUrl = url;
	}
	,getServerURL: function() {
		return this.getLoggingUrl();
	}
	,isABTestingURLValid: function() {
		return this._abTestingURL != null;
	}
	,setAbTestingUrl: function(value) {
		this._abTestingURL = value;
	}
	,getAbTestingUrl: function() {
		if(this.isABTestingURLValid()) return this._abTestingURL; else if(this._deployServerTag == cgs.server.CGSServerProps.LOCAL_SERVER) return cgs.server.abtesting.ABTesterConstants.AB_TEST_URL_LOCAL; else return cgs.server.abtesting.ABTesterConstants.GetAbTestingUrl(this._deployServerTag,this._serverVersion);
	}
	,isIntegrationUrlValid: function() {
		return this._integrationURL != null;
	}
	,setIntegrationUrl: function(value) {
		this._integrationURL = value;
	}
	,getIntegrationUrl: function() {
		if(this.isIntegrationUrlValid()) return this._integrationURL; else return cgs.server.CGSServerConstants.GetIntegrationUrl(this._deployServerTag,this._serverVersion);
	}
	,setUseProxy: function(value) {
		this._proxyCgsRequests = value;
	}
	,useProxy: function() {
		return this._proxyCgsRequests;
	}
	,setUseIntegrationProxy: function(value) {
		this._useIntegrationProxy = value;
	}
	,setProxyUrl: function(url) {
		this._externalProxyUrl = url;
	}
	,getProxyUrl: function() {
		if(this._useIntegrationProxy) return cgs.server.CGSServerConstants.GetProxyUrl(this._deployServerTag,this._serverVersion); else return this._externalProxyUrl;
	}
	,__class__: cgs.server.CGSServerProps
};
cgs.server.abtesting = {};
cgs.server.abtesting.ABTesterConstants = function() { };
cgs.server.abtesting.ABTesterConstants.__name__ = true;
cgs.server.abtesting.ABTesterConstants.GetAbTestingUrl = function(serverTag,version) {
	if(version == null) version = 1;
	var domain = cgs.server.abtesting.ABTesterConstants.DEV_AB_TEST_URL_DOMAIN;
	if(serverTag == cgs.server.CGSServerProps.PRODUCTION_SERVER) domain = cgs.server.abtesting.ABTesterConstants.AB_TEST_URL_DOMAIN; else if(serverTag == cgs.server.CGSServerProps.STAGING_SERVER) domain = cgs.server.abtesting.ABTesterConstants.STAGING_AB_TEST_URL_DOMAIN; else if(serverTag == cgs.server.CGSServerProps.STUDY_SERVER) domain = cgs.server.abtesting.ABTesterConstants.SCHOOLS_AB_TEST_BASE_URL; else if(serverTag == cgs.server.CGSServerProps.CUSTOM_SERVER) domain = cgs.server.abtesting.ABTesterConstants.CUSTOM_AB_TEST_URL_DOMAIN;
	var url = "http://" + domain + cgs.server.abtesting.ABTesterConstants.AB_TEST_URL_PATH;
	if(version == 2) url += cgs.server.abtesting.ABTesterConstants.CURRENT_VERSION; else if(version == cgs.server.CGSServerProps.VERSION1) url += cgs.server.abtesting.ABTesterConstants.VERSION_1; else if(version == 2) url += cgs.server.abtesting.ABTesterConstants.VERSION_2; else if(version == cgs.server.CGSServerProps.VERSION_DEV) url += cgs.server.abtesting.ABTesterConstants.VERSION_0;
	return url + cgs.server.abtesting.ABTesterConstants.AB_TEST_URL_PHP;
};
cgs.server.abtesting.ABTesterConstants.getGameABTestingURL = function(gameName) {
	return "http://" + gameName + ".ws.centerforgamescience.com/cgs/apps/abtest/ws/index.php/";
};
cgs.server.abtesting.IVariableProvider = function() { };
cgs.server.abtesting.IVariableProvider.__name__ = true;
cgs.server.abtesting.IVariableProvider.prototype = {
	__class__: cgs.server.abtesting.IVariableProvider
};
cgs.server.abtesting.AbTestingVariables = function() {
	this._variableMap = new haxe.ds.StringMap();
};
cgs.server.abtesting.AbTestingVariables.__name__ = true;
cgs.server.abtesting.AbTestingVariables.__interfaces__ = [cgs.server.abtesting.IVariableProvider];
cgs.server.abtesting.AbTestingVariables.prototype = {
	registerDefaultVariable: function(name,value) {
		var value1 = value;
		this._variableMap.set(name,value1);
	}
	,containsVariable: function(name) {
		return this._variableMap.exists(name);
	}
	,getVariableValue: function(name) {
		return this._variableMap.get(name);
	}
	,__class__: cgs.server.abtesting.AbTestingVariables
};
cgs.server.abtesting.IABTestingServer = function() { };
cgs.server.abtesting.IABTestingServer.__name__ = true;
cgs.server.abtesting.IABTestingServer.prototype = {
	__class__: cgs.server.abtesting.IABTestingServer
};
cgs.server.abtesting.IAbTestingServerApi = function() { };
cgs.server.abtesting.IAbTestingServerApi.__name__ = true;
cgs.server.abtesting.IAbTestingServerApi.prototype = {
	__class__: cgs.server.abtesting.IAbTestingServerApi
};
cgs.server.abtesting.ICgsUserAbTester = function() { };
cgs.server.abtesting.ICgsUserAbTester.__name__ = true;
cgs.server.abtesting.ICgsUserAbTester.prototype = {
	__class__: cgs.server.abtesting.ICgsUserAbTester
};
cgs.server.abtesting.IUserAbTester = function() { };
cgs.server.abtesting.IUserAbTester.__name__ = true;
cgs.server.abtesting.IUserAbTester.__interfaces__ = [cgs.server.abtesting.ICgsUserAbTester];
cgs.server.abtesting.IUserAbTester.prototype = {
	__class__: cgs.server.abtesting.IUserAbTester
};
cgs.server.abtesting.TestVariableTimer = function() {
	this._timedVarCount = 0;
	this._timerDelay = 200;
	this._varTimers = new haxe.ds.StringMap();
};
cgs.server.abtesting.TestVariableTimer.__name__ = true;
cgs.server.abtesting.TestVariableTimer.prototype = {
	startVariableTimer: function(varName) {
		var varTimer = this._varTimers.get(varName);
		if(varTimer == null) varTimer = this.addVariableTimer(varName);
		varTimer.start();
	}
	,addVariableTimer: function(varName) {
		var varTimer = new cgs.server.abtesting._TestVariableTimer.VariableTimer();
		this._varTimers.set(varName,varTimer);
		varTimer;
		if(this._timedVarCount == 0) this.start();
		this._timedVarCount++;
		return varTimer;
	}
	,removeVariableTimer: function(varName) {
		var varTimer = this._varTimers.get(varName);
		if(varTimer != null) {
			this._timedVarCount--;
			this._varTimers.remove(varName);
			if(this._timedVarCount == 0) this.stop();
		}
		return varTimer;
	}
	,pauseVariableTimer: function(varName) {
		var varTimer = this._varTimers.get(varName);
		if(varTimer != null) varTimer.pause();
	}
	,containsVariableTimer: function(varName) {
		return this._varTimers.exists(varName);
	}
	,endVariableTimer: function(varName) {
		var varTimer = this.removeVariableTimer(varName);
		if(varTimer != null) return varTimer.getElapsedTime(); else return 0;
	}
	,onTick: function() {
		var $it0 = this._varTimers.iterator();
		while( $it0.hasNext() ) {
			var varTimer = $it0.next();
			varTimer.onTick(this._timerDelay);
		}
	}
	,start: function() {
		if(this._timer == null) {
			this._timer = new haxe.Timer(this._timerDelay);
			this._timer.run = $bind(this,this.onTick);
		}
	}
	,stop: function() {
		if(this._timer != null) {
			this._timer.stop();
			this._timer = null;
		}
	}
	,__class__: cgs.server.abtesting.TestVariableTimer
};
cgs.server.abtesting._TestVariableTimer = {};
cgs.server.abtesting._TestVariableTimer.VariableTimer = function() {
	this._elapsedTime = 0;
	this._elapsedTime = 0;
	this._running = true;
};
cgs.server.abtesting._TestVariableTimer.VariableTimer.__name__ = true;
cgs.server.abtesting._TestVariableTimer.VariableTimer.prototype = {
	onTick: function(delta) {
		if(this._running) this._elapsedTime += delta;
	}
	,pause: function() {
		this._running = false;
	}
	,start: function() {
		this._running = true;
	}
	,reset: function() {
		this._elapsedTime = 0;
		this._running = true;
	}
	,getElapsedTime: function() {
		return this._elapsedTime / 1000;
	}
	,__class__: cgs.server.abtesting._TestVariableTimer.VariableTimer
};
cgs.server.abtesting.UserAbTester = function(server,defaultVars) {
	this._server = server;
	this._variables = new haxe.ds.StringMap();
	this._testVariableTimer = new cgs.server.abtesting.TestVariableTimer();
	this._defaultVariables = defaultVars;
};
cgs.server.abtesting.UserAbTester.__name__ = true;
cgs.server.abtesting.UserAbTester.__interfaces__ = [cgs.server.abtesting.IUserAbTester];
cgs.server.abtesting.UserAbTester.CancelVariableTesting = function(varName,details) {
};
cgs.server.abtesting.UserAbTester.prototype = {
	setDefaultVariableProvider: function(value) {
		this._defaultVariables = value;
		var $it0 = this._variables.iterator();
		while( $it0.hasNext() ) {
			var variable = $it0.next();
			variable.setDefaultVariableProvider(this._defaultVariables);
		}
	}
	,setServerApi: function(server) {
		this._server = server;
	}
	,getUserTestId: function() {
		if(this._tests == null) return 0;
		if(this._tests.length == 0) return 0;
		return this._tests[0].getId();
	}
	,getUserCategoryId: function() {
		if(this._tests == null) return 0;
		if(this._tests.length == 0) return 0;
		return this._tests[0].getCid();
	}
	,getUserConditionId: function() {
		if(this._tests == null) return 0;
		if(this._tests.length == 0) return 0;
		return this._tests[0].getConditionID();
	}
	,loadTestConditions: function(callback,existing) {
		if(existing == null) existing = false;
		this.resetTestConditions();
		this._conditionsCallback = callback;
		this._server.requestUserTestConditions(existing,$bind(this,this.handleConditionsLoaded));
	}
	,noConditionUser: function() {
		this._server.noUserConditions();
	}
	,resetTestConditions: function() {
		var $it0 = this._variables.iterator();
		while( $it0.hasNext() ) {
			var variable = $it0.next();
			variable.removeTestVariables();
		}
	}
	,handleConditionsLoaded: function(response) {
		if(!response.failed()) this.parseJSONData(response.getData());
		if(this._conditionsCallback != null) {
			this._conditionsCallback(response);
			this._conditionsCallback = null;
		}
	}
	,registerDefaultValue: function(varName,value,valueType) {
		var varContainer = this._variables.get(varName);
		if(varContainer == null) {
			varContainer = new cgs.server.abtesting._UserAbTester.VariableContainer(varName,value,valueType);
			this._variables.set(varName,varContainer);
			varContainer;
		} else {
			varContainer.setDefaultValue(value);
			varContainer.setType(valueType);
		}
	}
	,registerTestVariable: function(variable) {
		var varContainer;
		var key = variable.getName();
		varContainer = this._variables.get(key);
		if(varContainer == null) {
			varContainer = new cgs.server.abtesting._UserAbTester.VariableContainer(variable.getName(),variable.getValue(),variable.getType());
			var key1 = variable.getName();
			this._variables.set(key1,varContainer);
		}
		varContainer.setTestVariable(variable);
	}
	,getVariableValue: function(varName) {
		var varValue = null;
		var varCon = this._variables.get(varName);
		if(varCon != null) varValue = varCon.currentValue(); else if(this._defaultVariables.containsVariable(varName)) varValue = this._defaultVariables.getVariableValue(varName);
		return varValue;
	}
	,getVariable: function(varName) {
		var varCon = this._variables.get(varName);
		if(varCon != null) return varCon.getTestVariable();
		return null;
	}
	,isVariableInTest: function(varName) {
		var varContainer = this._variables.get(varName);
		if(varContainer != null) return varContainer.isInTest();
		return false;
	}
	,overrideVariableValue: function(varName,value) {
		var varCon = this._variables.get(varName);
		if(varCon != null) varCon.setOverrideValue(value);
	}
	,variableTested: function(varName,results) {
		var variable = this.getVariable(varName);
		if(variable == null) return;
		var test = variable.getAbTest();
		if(!test.hasTestingStarted()) this.logTestStart(test.getId(),test.getConditionID());
		variable.setTestingStarted(true);
		this.logVariableTestStart(test.getId(),test.getConditionID(),variable.getId(),test.nextResultID());
		variable.setTested(true);
		this.logVariableResults(test.getId(),test.getConditionID(),variable.getId(),test.currentResultID(),-1,results);
		if(test.tested()) this.logTestEnd(test.getId(),test.getConditionID());
	}
	,startVariableTesting: function(varName,startData) {
		this.sendVariableStart(varName,-1,startData);
	}
	,sendVariableStart: function(varName,time,detail) {
		if(time == null) time = -1;
		var variable = this.getVariable(varName);
		if(variable == null) return;
		variable.setInTest(true);
		var test = variable.getAbTest();
		if(!test.hasTestingStarted()) this.logTestStart(test.getId(),test.getConditionID());
		variable.setTestingStarted(true);
		this.logVariableTestStart(test.getId(),test.getConditionID(),variable.getId(),test.nextResultID(),time,detail);
	}
	,endVariableTesting: function(varName,results) {
		var time = -1;
		if(this._testVariableTimer.containsVariableTimer(varName)) time = this._testVariableTimer.endVariableTimer(varName);
		this.sendVariableResults(varName,time,results);
	}
	,sendVariableResults: function(varName,time,results) {
		if(time == null) time = -1;
		var variable = this.getVariable(varName);
		if(variable == null) return;
		if(!variable.getInTest()) return;
		var test = variable.getAbTest();
		variable.setTested(true);
		this.logVariableResults(test.getId(),test.getConditionID(),variable.getId(),test.currentResultID(),time,results);
		if(test.tested()) {
			this.logTestEnd(test.getId(),test.getConditionID());
			test.reset();
		}
	}
	,cancelVariableTesting: function(varName,details) {
	}
	,startTimedVariableTesting: function(varName,startData) {
		var variable = this.getVariable(varName);
		if(variable == null) return;
		if(variable.getInTest()) return;
		this._testVariableTimer.startVariableTimer(varName);
		this.sendVariableStart(varName,-1,startData);
	}
	,logTestStart: function(testID,condID) {
		this._server.logTestStart(testID,condID);
	}
	,logTestEnd: function(testID,condID) {
		this._server.logTestEnd(testID,condID);
	}
	,logVariableTestStart: function(testID,condID,varID,resultID,time,detail) {
		if(time == null) time = -1;
		this._server.logConditionVariableStart(testID,condID,varID,resultID,time,detail);
	}
	,logVariableResults: function(testID,condID,varID,resultID,time,detail) {
		if(time == null) time = -1;
		this._server.logConditionVariableResults(testID,condID,varID,resultID,time,detail);
	}
	,logCancelVariableTesting: function(testID,condID,varID,detail) {
	}
	,getABTest: function(id) {
		if(this._tests == null) return null;
		var _g = 0;
		var _g1 = this._tests;
		while(_g < _g1.length) {
			var test = _g1[_g];
			++_g;
			if(test.getId() == id) return test;
		}
		return null;
	}
	,parseJSONData: function(data) {
		if(data == null) return;
		this._tests = new Array();
		var testData = data.tests;
		var test;
		var _g = 0;
		while(_g < testData.length) {
			var currTestData = testData[_g];
			++_g;
			test = new cgs.server.abtesting.tests.ABTest();
			test.parseJSONData(currTestData);
			this.addTestVariables(test);
			this._tests.push(test);
		}
		var testID = 0;
		if(Object.prototype.hasOwnProperty.call(data,"t_status")) {
			var testStatus = data.t_status;
			var _g1 = 0;
			while(_g1 < testStatus.length) {
				var currTestStatus = testStatus[_g1];
				++_g1;
				testID = currTestStatus.test_id;
				test = this.getABTest(testID);
				if(test != null) test.parseTestStatusData(currTestStatus);
			}
		}
		if(Object.prototype.hasOwnProperty.call(data,"v_status")) {
			var variablesStatus = data.v_status;
			var _g2 = 0;
			while(_g2 < variablesStatus.length) {
				var currVarStatus = variablesStatus[_g2];
				++_g2;
				testID = currVarStatus.test_id;
				test = this.getABTest(testID);
				if(test != null) test.parseVariableStatus(currVarStatus);
			}
		}
	}
	,addTestVariables: function(test) {
		var _g = 0;
		var _g1 = test.getVariables();
		while(_g < _g1.length) {
			var variable = _g1[_g];
			++_g;
			this.registerTestVariable(variable);
		}
	}
	,__class__: cgs.server.abtesting.UserAbTester
};
cgs.server.abtesting._UserAbTester = {};
cgs.server.abtesting._UserAbTester.VariableContainer = function(name,defaultValue,varType,defaultVars) {
	this._varType = 0;
	this._name = name;
	this._defaultValue = defaultValue;
	this._varType = varType;
	this._defaultVars = defaultVars;
};
cgs.server.abtesting._UserAbTester.VariableContainer.__name__ = true;
cgs.server.abtesting._UserAbTester.VariableContainer.prototype = {
	setDefaultVariableProvider: function(value) {
		this._defaultVars = value;
	}
	,setType: function(type) {
		this._varType = type;
	}
	,currentValue: function() {
		if(this._overrideValue != null || this._overrideIsNull) return this._overrideValue; else if(this._testVariable != null) return this._testVariable.getValue(); else if(this._defaultValue != null || this._defaultIsNull) return this._defaultValue; else if(this._defaultVars != null) return this._defaultVars.getVariableValue(this._name);
		return null;
	}
	,setDefaultValue: function(value) {
		this._defaultValue = value;
		this._defaultIsNull = this._defaultValue == null;
	}
	,setOverrideValue: function(value) {
		this._overrideValue = value;
		this._overrideIsNull = this._overrideValue == null;
	}
	,removeTestVariables: function() {
		this._testVariable = null;
		this._overrideValue = null;
	}
	,setTestVariable: function(value) {
		this._testVariable = value;
	}
	,isInTest: function() {
		return this._testVariable != null;
	}
	,getTestVariable: function() {
		return this._testVariable;
	}
	,__class__: cgs.server.abtesting._UserAbTester.VariableContainer
};
cgs.server.messages = {};
cgs.server.messages.Message = function(serverData,time) {
	this._messageObject = { };
	this._gameServerData = serverData;
	this._serverTime = time;
};
cgs.server.messages.Message.__name__ = true;
cgs.server.messages.Message.prototype = {
	setServerTime: function(time) {
		this._serverTime = time;
	}
	,setServerData: function(data) {
		this._gameServerData = data;
	}
	,getServerData: function() {
		return this._gameServerData;
	}
	,addProperty: function(key,value) {
		this._messageObject[key] = value;
	}
	,addProperties: function(propObject) {
		var _g = 0;
		var _g1 = Reflect.fields(propObject);
		while(_g < _g1.length) {
			var key = _g1[_g];
			++_g;
			Reflect.setField(this._messageObject,key,Reflect.field(propObject,key));
		}
	}
	,getMessageObject: function() {
		return this._messageObject;
	}
	,getUid: function() {
		return this._gameServerData.getUid();
	}
	,injectSKEY: function() {
		var skeyHashType = this._gameServerData.getSkeyHashVersion();
		if(skeyHashType == 1) this._messageObject.skey = this._gameServerData.createSkeyHash(this.getUid()); else if(skeyHashType == cgs.server.logging.GameServerData.NO_SKEY_HASH) this._messageObject.skey = this._gameServerData.getSkey();
	}
	,injectGameParams: function() {
		this._messageObject.g_name = this._gameServerData.getGameName();
		this._messageObject.gid = this._gameServerData.getGameId();
		this._messageObject.vid = this._gameServerData.getVersionId();
		if(!this._gameServerData.getLegacyMode()) this._messageObject.svid = this._gameServerData.getSvid();
	}
	,injectGameId: function() {
		this._messageObject.gid = this._gameServerData.getGameId();
	}
	,injectExternalParams: function() {
		this._messageObject.ext_s_id = this._gameServerData.getExternalSourceId();
		this._messageObject.ext_app_id = this._gameServerData.getExternalAppId();
	}
	,injectParams: function() {
		this.injectGameParams();
		this._messageObject.uid = this.getUid();
		this._messageObject.cid = this._gameServerData.getCid();
		this.injectSKEY();
	}
	,injectCategoryId: function() {
		this._messageObject.cid = this._gameServerData.getCid();
	}
	,injectUserName: function() {
		this._messageObject.uname = this._gameServerData.getUserName();
	}
	,injectConditionId: function() {
		if(this._gameServerData.isConditionIdValid()) this._messageObject.cd_id = this._gameServerData.getConditionId();
	}
	,injectEventID: function(required) {
		if(required || this._gameServerData.isEventIDValid()) if(this._gameServerData.isEventIDValid()) this._messageObject.eid = this._gameServerData.getEid(); else this._messageObject.eid = 0;
	}
	,injectTypeID: function(required) {
		if(required || this._gameServerData.isTypeIDValid()) if(this._gameServerData.isTypeIDValid()) this._messageObject.tid = this._gameServerData.getTid(); else this._messageObject.tid = 0;
	}
	,injectLevelID: function(required) {
		if(required || this._gameServerData.isLevelIDValid()) if(this._gameServerData.isLevelIDValid()) this._messageObject.lid = this._gameServerData.getLid(); else this._messageObject.lid = 0;
	}
	,hasClientTimeStamp: function() {
		return this._requiresTimeStamp;
	}
	,injectClientTimeStamp: function() {
		if(this._serverTime == null) return;
		this._requiresTimeStamp = true;
		if(this._serverTime.isTimeValid()) {
			this._timeStampValid = true;
			this._timestamp = this.getClientTimestamp();
			this.addProperty("client_ts",this._timestamp);
		} else this._localTimeStamp = this._serverTime.getClientTimeStamp();
	}
	,updateClientTimeStamp: function() {
		if(this._timeStampValid) return;
		if(this._localTimeStamp > 0) this._timestamp = this._serverTime.getOffsetClientTimeStamp(this._localTimeStamp); else this._timestamp = this.getClientTimestamp();
		this.addProperty("client_ts",this._timestamp);
	}
	,getLocalClientTimestamp: function() {
		if(this._timeStampValid) return this._timestamp; else return this._localTimeStamp;
	}
	,getClientTimestamp: function() {
		if(this._serverTime == null) return 0;
		return this._serverTime.getClientTimeStamp();
	}
	,injectExperimentId: function() {
		var serverData = this.getServerData();
		if(serverData == null) return;
		if(serverData.isExperimentIdValid()) this.addProperty("exper_id",serverData.getExperimentId());
	}
	,setRequireSessionId: function(value) {
		this._requireSessionId = value;
	}
	,hasSessionId: function() {
		return this._requireSessionId;
	}
	,injectSessionId: function() {
		this.addProperty("sessionid",this._gameServerData.getSessionId());
	}
	,injectSessionID: function(required) {
		if(required || this._gameServerData.isSessionIDValid()) if(this._gameServerData.isSessionIDValid()) this._messageObject.sid = this._gameServerData.getSessionId(); else this._messageObject.sid = "0";
	}
	,__class__: cgs.server.messages.Message
};
cgs.server.abtesting.messages = {};
cgs.server.abtesting.messages.ConditionVariableMessage = function(testID,conditionID,varID,resultID,start,time,detail,serverData,serverTime) {
	if(time == null) time = -1;
	if(start == null) start = false;
	cgs.server.messages.Message.call(this,serverData,serverTime);
	this.addProperty("test_id",testID);
	this.addProperty("cond_id",conditionID);
	this.addProperty("var_id",varID);
	this.addProperty("start",start?1:0);
	this.addProperty("result_id",resultID);
	if(time >= 0) this.addProperty("time",time);
	if(detail != null) this.addProperty("detail",JSON.parse(detail));
};
cgs.server.abtesting.messages.ConditionVariableMessage.__name__ = true;
cgs.server.abtesting.messages.ConditionVariableMessage.__super__ = cgs.server.messages.Message;
cgs.server.abtesting.messages.ConditionVariableMessage.prototype = $extend(cgs.server.messages.Message.prototype,{
	__class__: cgs.server.abtesting.messages.ConditionVariableMessage
});
cgs.server.abtesting.messages.TestStatusMessage = function(testID,conditionID,start,detail,serverData,serverTime) {
	if(start == null) start = true;
	cgs.server.messages.Message.call(this,serverData,serverTime);
	this.addProperty("test_id",testID);
	this.addProperty("cond_id",conditionID);
	this.addProperty("start",start?1:0);
	if(detail != null) this.addProperty("detail",JSON.parse(detail));
};
cgs.server.abtesting.messages.TestStatusMessage.__name__ = true;
cgs.server.abtesting.messages.TestStatusMessage.__super__ = cgs.server.messages.Message;
cgs.server.abtesting.messages.TestStatusMessage.prototype = $extend(cgs.server.messages.Message.prototype,{
	__class__: cgs.server.abtesting.messages.TestStatusMessage
});
cgs.server.abtesting.tests = {};
cgs.server.abtesting.tests.ABTest = function() {
	this._completeCount = 0;
	this._cid = 0;
	this._id = 0;
	this._testStatus = new cgs.server.abtesting.tests.TestStatus();
};
cgs.server.abtesting.tests.ABTest.__name__ = true;
cgs.server.abtesting.tests.ABTest.prototype = {
	getId: function() {
		return this._id;
	}
	,hasCID: function() {
		return this._cid >= 0;
	}
	,getCid: function() {
		return this._cid;
	}
	,nextResultID: function() {
		return this._testStatus.nextResultID();
	}
	,currentResultID: function() {
		return this._testStatus.currentResultID();
	}
	,getConditionID: function() {
		return this._condition.getId();
	}
	,getVariables: function() {
		return this._condition.getVariables();
	}
	,hasTestingStarted: function() {
		return this._condition.hasTestingStarted();
	}
	,reset: function() {
		this._completeCount++;
		this._condition.reset();
	}
	,tested: function() {
		return this._condition.tested();
	}
	,parseTestStatusData: function(dataObj) {
		this._testStatus.parseTestStatusData(dataObj);
	}
	,parseVariableStatus: function(dataObj) {
		this._testStatus.parseVariableStatusData(dataObj);
	}
	,parseJSONData: function(dataObj) {
		this._id = dataObj.test_id;
		this._multiResults = dataObj.multi_results;
		this._condition = new cgs.server.abtesting.tests.Condition();
		this._condition.parseJSONData(dataObj.cond);
		this._condition.setTest(this);
		this._cid = dataObj.cid;
	}
	,__class__: cgs.server.abtesting.tests.ABTest
};
cgs.server.abtesting.tests.Condition = function() {
	this._id = 0;
};
cgs.server.abtesting.tests.Condition.__name__ = true;
cgs.server.abtesting.tests.Condition.prototype = {
	getId: function() {
		return this._id;
	}
	,getVariables: function() {
		if(this._variables != null) return this._variables.slice(); else return null;
	}
	,hasTestingStarted: function() {
		var _g = 0;
		var _g1 = this._variables;
		while(_g < _g1.length) {
			var variable = _g1[_g];
			++_g;
			if(variable.getTestingStarted()) return true;
		}
		return false;
	}
	,reset: function() {
		var _g = 0;
		var _g1 = this._variables;
		while(_g < _g1.length) {
			var variable = _g1[_g];
			++_g;
			variable.setTested(false);
		}
	}
	,tested: function() {
		var _g = 0;
		var _g1 = this._variables;
		while(_g < _g1.length) {
			var variable = _g1[_g];
			++_g;
			if(!variable.getTested()) return false;
		}
		return true;
	}
	,setTest: function(abtest) {
		this._test = abtest;
	}
	,getTest: function() {
		return this._test;
	}
	,parseJSONData: function(dataObj) {
		this._id = dataObj.cond_id;
		this._variables = new Array();
		var variable;
		var vars = dataObj.vars;
		var _g = 0;
		while(_g < vars.length) {
			var varObj = vars[_g];
			++_g;
			variable = new cgs.server.abtesting.tests.Variable();
			variable.parseJSONData(varObj);
			variable.setCondition(this);
			this._variables.push(variable);
		}
	}
	,__class__: cgs.server.abtesting.tests.Condition
};
cgs.server.abtesting.tests.ConditionTestStatus = function() {
	this._condID = 0;
	this._variables = new Array();
};
cgs.server.abtesting.tests.ConditionTestStatus.__name__ = true;
cgs.server.abtesting.tests.ConditionTestStatus.prototype = {
	getVariableStatus: function(id) {
		var _g = 0;
		var _g1 = this._variables;
		while(_g < _g1.length) {
			var variable = _g1[_g];
			++_g;
			if(variable.getId() == id) return variable;
		}
		return null;
	}
	,parseVariableStatusData: function(dataObj) {
		var varID = dataObj.var_id;
		var variable = this.getVariableStatus(varID);
		if(variable == null) {
			variable = new cgs.server.abtesting.tests.VariableTestStatus(varID);
			this._variables.push(variable);
		}
		variable.parseVariableStatusData(dataObj);
	}
	,__class__: cgs.server.abtesting.tests.ConditionTestStatus
};
cgs.server.abtesting.tests.TestStatus = function() {
	this._currResultID = 0;
	this._completeCount = 0;
	this._startCount = 0;
	this._conditonStatus = new cgs.server.abtesting.tests.ConditionTestStatus();
};
cgs.server.abtesting.tests.TestStatus.__name__ = true;
cgs.server.abtesting.tests.TestStatus.prototype = {
	nextResultID: function() {
		return ++this._currResultID;
	}
	,currentResultID: function() {
		return this._currResultID;
	}
	,parseTestStatusData: function(dataObj) {
		this._completeCount = dataObj.count;
		this._completed = this._completeCount > 0;
		this._currResultID = dataObj.result_id;
	}
	,parseVariableStatusData: function(dataObj) {
		this._conditonStatus.parseVariableStatusData(dataObj);
	}
	,__class__: cgs.server.abtesting.tests.TestStatus
};
cgs.server.abtesting.tests.Variable = function() {
	this._type = 0;
	this._id = 0;
};
cgs.server.abtesting.tests.Variable.__name__ = true;
cgs.server.abtesting.tests.Variable.prototype = {
	getId: function() {
		return this._id;
	}
	,getAbTest: function() {
		if(this._condition != null) return this._condition.getTest(); else return null;
	}
	,getName: function() {
		return this._name;
	}
	,setResults: function(value) {
		this._results = value;
	}
	,getResults: function() {
		return this._results;
	}
	,hasResults: function() {
		return this._results != null;
	}
	,setInTest: function(value) {
		this._inTest = value;
	}
	,getInTest: function() {
		return this._inTest;
	}
	,setTestingStarted: function(value) {
		this._testingStarted = value;
	}
	,getTestingStarted: function() {
		return this._testingStarted;
	}
	,setTested: function(value) {
		this._tested = value;
	}
	,getTested: function() {
		return this._tested;
	}
	,setCondition: function(cond) {
		this._condition = cond;
	}
	,getValue: function() {
		return this._value;
	}
	,getType: function() {
		return this._type;
	}
	,parseJSONData: function(dataObj) {
		this._id = dataObj.id;
		this._name = dataObj.v_key;
		this._type = dataObj.v_type;
		if(this._type == cgs.server.abtesting.tests.Variable.BOOLEAN_VARIABLE) this._value = this.convertToBoolean(dataObj.v_value); else this._value = dataObj.v_value;
	}
	,convertToBoolean: function(text) {
		var normalizedText = text.toLowerCase();
		return normalizedText == "true" || normalizedText == "1";
	}
	,__class__: cgs.server.abtesting.tests.Variable
};
cgs.server.abtesting.tests.VariableTestStatus = function(id) {
	this._completeCount = 0;
	this._startCount = 0;
	this._id = 0;
	this._id = id;
};
cgs.server.abtesting.tests.VariableTestStatus.__name__ = true;
cgs.server.abtesting.tests.VariableTestStatus.prototype = {
	getId: function() {
		return this._id;
	}
	,parseVariableStatusData: function(dataObj) {
		if(Object.prototype.hasOwnProperty.call(dataObj,"start")) {
			var start = dataObj.start == "1";
			var count = dataObj.v_count;
			if(start) {
				this._started = true;
				this._startCount = count;
			} else {
				this._completed = true;
				this._completeCount = count;
			}
		}
	}
	,__class__: cgs.server.abtesting.tests.VariableTestStatus
};
cgs.server.appdata = {};
cgs.server.appdata.UserDataChunk = function(key,data) {
	this._dataKey = key;
	this._data = data;
};
cgs.server.appdata.UserDataChunk.__name__ = true;
cgs.server.appdata.UserDataChunk.prototype = {
	getKey: function() {
		return this._dataKey;
	}
	,getData: function() {
		return this._data;
	}
	,__class__: cgs.server.appdata.UserDataChunk
};
cgs.server.appdata.UserGameData = function() {
	this._gameData = new haxe.ds.StringMap();
};
cgs.server.appdata.UserGameData.__name__ = true;
cgs.server.appdata.UserGameData.setSupportLegacyData = function(value) {
	cgs.server.appdata.UserGameData.supportLegacyData = value;
	cgs.server.responses.UserDataChunkResponse.SupportLegacyData = true;
};
cgs.server.appdata.UserGameData.prototype = {
	getKeys: function() {
		var keys = [];
		var $it0 = this._gameData.keys();
		while( $it0.hasNext() ) {
			var key = $it0.next();
			keys.push(key);
		}
		return keys;
	}
	,isServerDataLoaded: function() {
		return this._serverDataLoaded;
	}
	,containsData: function(key) {
		if(this._gameData.exists(key)) {
			var value = this._gameData.get(key);
			return value != null;
		}
		return false;
	}
	,getData: function(key) {
		return this._gameData.get(key);
	}
	,updateData: function(key,value) {
		var value1 = value;
		this._gameData.set(key,value1);
	}
	,copyData: function(data) {
		var $it0 = this._gameData.keys();
		while( $it0.hasNext() ) {
			var dataKey = $it0.next();
			var value = this._gameData.get(dataKey);
			data._gameData.set(dataKey,value);
		}
		this._serverDataLoaded = true;
	}
	,parseUserGameData: function(data) {
		if(data == null) {
			console.log("Game data chunks are null");
			return;
		}
		var key;
		var rawData;
		var _g = 0;
		while(_g < data.length) {
			var dataChunk = data[_g];
			++_g;
			key = dataChunk.u_data_id;
			rawData = dataChunk.data_detail;
			if(typeof(rawData) == "string") {
				var stringData = rawData;
				if(stringData.toLowerCase() == "null") this.updateData(key,null); else if(cgs.server.appdata.UserGameData.supportLegacyData) {
					if(stringData.length == 0) this.updateData(key,stringData); else if(stringData.charAt(0) == "{" || stringData.charAt(0) == "[") this.updateData(key,JSON.parse(rawData)); else this.updateData(key,stringData);
				} else this.updateData(key,stringData);
			} else this.updateData(key,rawData);
		}
		this._serverDataLoaded = true;
	}
	,__class__: cgs.server.appdata.UserGameData
};
cgs.server.services = {};
cgs.server.services.RemoteService = function(requestHandler,serviceUrl) {
	this._requestHandler = requestHandler;
	this._serviceUrl = serviceUrl;
};
cgs.server.services.RemoteService.__name__ = true;
cgs.server.services.RemoteService.getTimeStamp = function() {
	return cgs.utils.Base64.getTimestamp();
};
cgs.server.services.RemoteService.prototype = {
	getRequestHandler: function() {
		return this._requestHandler;
	}
	,getUrl: function() {
		return this._serviceUrl;
	}
	,setUrl: function(value) {
		this._serviceUrl = value;
	}
	,sendRequest: function(request) {
		return this._requestHandler.sendUrlRequest(request);
	}
	,__class__: cgs.server.services.RemoteService
};
cgs.server.services.CgsService = function(requestHandler,serverTag,version) {
	if(version == null) version = 2;
	this._version = 0;
	cgs.server.services.RemoteService.call(this,requestHandler);
	this.setServer(serverTag,version);
};
cgs.server.services.CgsService.__name__ = true;
cgs.server.services.CgsService.__super__ = cgs.server.services.RemoteService;
cgs.server.services.CgsService.prototype = $extend(cgs.server.services.RemoteService.prototype,{
	setServer: function(tag,version) {
		this._serverTag = tag;
		this._version = version;
		this.setUrl(this.getServiceUrl(tag,version));
	}
	,getServiceUrl: function(server,version) {
		var domain = cgs.server.services.CgsService.DEV_URL_DOMAIN;
		if(server == cgs.server.services.CgsService.PRODUCTION_SERVER) domain = cgs.server.services.CgsService.URL_DOMAIN; else if(server == cgs.server.services.CgsService.LOCAL_SERVER) domain = cgs.server.services.CgsService.LOCAL_URL_DOMAIN;
		var url = "http://" + domain;
		if(server != cgs.server.services.CgsService.LOCAL_SERVER) {
			url += cgs.server.services.CgsService.URL_PATH;
			if(version == cgs.server.services.CgsService.CURRENT_VERSION) url += cgs.server.services.CgsService.URL_CURRENT_VERSION; else if(version == cgs.server.services.CgsService.VERSION1) url += cgs.server.services.CgsService.URL_VERSION_1; else if(version == cgs.server.services.CgsService.VERSION2) url += cgs.server.services.CgsService.URL_VERSION_2; else if(version == cgs.server.services.CgsService.VERSION_DEV) url += cgs.server.services.CgsService.URL_VERSION_0;
		}
		return url + cgs.server.services.CgsService.URL_PHP;
	}
	,__class__: cgs.server.services.CgsService
});
cgs.server.challenge = {};
cgs.server.challenge.ChallengeService = function(requestHandler,cgsUser,challengeId,serverTag,version) {
	if(version == null) version = 2;
	this._challengeId = 0;
	cgs.server.services.CgsService.call(this,requestHandler,serverTag,version);
	this._challengeId = challengeId;
	this.registerUser(cgsUser);
};
cgs.server.challenge.ChallengeService.__name__ = true;
cgs.server.challenge.ChallengeService.__super__ = cgs.server.services.CgsService;
cgs.server.challenge.ChallengeService.prototype = $extend(cgs.server.services.CgsService.prototype,{
	registerUser: function(user) {
		this._cgsUser = user;
		this._cgsServer = user.getServer();
	}
	,setChallengeId: function(value) {
		this._challengeId = value;
	}
	,hasChallengeStarted: function(callback) {
		this.checkChallengeDetails(function(data,success) {
			var started = false;
			if(data != null) {
				if(Object.prototype.hasOwnProperty.call(data,"r_data")) {
					var challengeData = data.r_data;
					if(Object.prototype.hasOwnProperty.call(challengeData,"started")) started = data.r_data.started == 1;
				}
			}
			callback(started,success);
		});
	}
	,registerMember: function(gradeLevel,callback) {
		var message = this._cgsServer.getMessage();
		message.addProperty("challenge_id",this._challengeId);
		message.addProperty("teacher_uid","0");
		message.addProperty("grade",gradeLevel);
		var request = new cgs.server.requests.ServiceRequest(cgs.server.challenge.ChallengeService.REGISTER_MEMBER,message,this._cgsServer.getCurrentGameServerData(),function(responseStatus) {
			if(callback != null) callback(responseStatus.failed());
		});
		if(!this._cgsUser.isUidValid()) {
			request.addRequestDependency(this._cgsUser.getUidRequestDependency());
			request.addReadyHandler(function(request1) {
				request1.injectUid();
			});
		} else request.injectUid();
		request.addParameter("challenge_id","" + this._challengeId);
		request.setRequestType(cgs.server.requests.ServerRequest.POST);
		request.setBaseUrl(this.getUrl());
		this._cgsServer.sendRequest(request);
	}
	,hasChallengeEnded: function(callback) {
		this.checkChallengeDetails(function(data,success) {
			var ended = true;
			if(data != null) {
				if(Object.prototype.hasOwnProperty.call(data,"r_data")) {
					var challengeData = data.r_data;
					if(Object.prototype.hasOwnProperty.call(challengeData,"ended")) ended = data.ended == 1;
				}
			}
			callback(ended,success);
		});
	}
	,checkChallengeDetails: function(dataHandler) {
		var message = this._cgsServer.getMessage();
		message.addProperty("challenge_id",this._challengeId);
		var request = new cgs.server.requests.ServiceRequest(cgs.server.challenge.ChallengeService.RETRIEVE_DETAILS,message,this._cgsServer.getCurrentGameServerData(),function(responseStatus) {
			if(dataHandler != null) {
				var data = responseStatus.getData();
				dataHandler(data,responseStatus.success());
			}
		});
		request.setRequestType(cgs.server.requests.ServerRequest.GET);
		request.setBaseUrl(this.getUrl());
		this._cgsServer.sendRequest(request);
	}
	,saveUserEquationWithPlaytime: function(time,solveStatus,callback) {
		if(solveStatus == null) solveStatus = 1;
		var message = this.getChallengeMessage();
		message.addProperty("playtime",time);
		message.addProperty("status",solveStatus);
		this.handleSimpleRequest(cgs.server.challenge.ChallengeService.SAVE_EQUATION_WITH_TIME,message,callback);
	}
	,saveMasteryEquation: function(time,masteryStatus,solveStatus,callback) {
		if(solveStatus == null) solveStatus = 1;
		if(masteryStatus == null) masteryStatus = 1;
		var message = this.getChallengeMessage();
		message.addProperty("playtime",time);
		message.addProperty("status",solveStatus);
		message.addProperty("mastery",masteryStatus);
		this.handleSimpleRequest(cgs.server.challenge.ChallengeService.SAVE_MASTERY_EQUATION,message,callback);
	}
	,updateUserPlaytime: function(time,callback) {
		var message = this.getChallengeMessage();
		message.addProperty("playtime",time);
		this.handleSimpleRequest(cgs.server.challenge.ChallengeService.SAVE_ACTIVE_TIME,message,callback);
	}
	,saveUserEquation: function(solveStatus,callback) {
		if(solveStatus == null) solveStatus = 1;
		var message = this.getChallengeMessage();
		message.addProperty("status",solveStatus);
		this.handleSimpleRequest(cgs.server.challenge.ChallengeService.SAVE_EQUATION,message,callback);
	}
	,updateUserMastery: function(callback,masteryStatus) {
		if(masteryStatus == null) masteryStatus = 1;
		var message = this.getChallengeMessage();
		message.addProperty("mastery",masteryStatus);
		this.handleSimpleRequest(cgs.server.challenge.ChallengeService.UPDATE_MASTERY,message,callback);
	}
	,handleSimpleRequest: function(method,message,callback) {
		var request = new cgs.server.requests.ServiceRequest(method,message,this._cgsServer.getCurrentGameServerData(),function(responseStatus) {
			if(callback != null) callback(responseStatus.failed());
		});
		request.addParameter("challenge_id","" + this._challengeId);
		if(this._cgsUser.isDqidValid()) {
			var dqid = this._cgsUser.getDqid();
			message.addProperty("dqid",dqid);
			message.addProperty("quest_id",this._cgsUser.getQuestId());
		} else {
			this._cgsUser.addDqidCallback((function($this) {
				var $r;
				var handleDqid = function(dqid1) {
					message.addProperty("dqid",dqid1);
				};
				$r = handleDqid;
				return $r;
			}(this)));
			request.addDependencyById(this._cgsUser.getDqidRequestId(),true);
		}
		if(!this._cgsUser.isUidValid()) {
			request.addRequestDependency(this._cgsUser.getUidRequestDependency());
			request.addReadyHandler(function(request1) {
				request1.injectUid();
			});
		} else request.injectUid();
		request.setRequestType(cgs.server.requests.ServerRequest.POST);
		request.setBaseUrl(this.getUrl());
		this._cgsServer.sendRequest(request);
	}
	,getChallengeMessage: function() {
		var message = this._cgsServer.getMessage();
		message.injectClientTimeStamp();
		message.injectParams();
		var userData = this._cgsServer.getUserData();
		var teacherUid = null;
		if(userData != null) teacherUid = userData.getTeacherUid(); else teacherUid = "0";
		message.addProperty("teacher_uid",teacherUid);
		message.addProperty("challenge_id",this._challengeId);
		return message;
	}
	,getServiceUrl: function(server,version) {
		var domain = cgs.server.challenge.ChallengeService.DEV_URL_DOMAIN;
		if(server == cgs.server.CGSServerProps.PRODUCTION_SERVER) domain = cgs.server.challenge.ChallengeService.URL_DOMAIN; else if(server == cgs.server.CGSServerProps.LOCAL_SERVER) domain = "localhost:10051";
		var url = "http://" + domain + cgs.server.challenge.ChallengeService.URL_PATH;
		if(version == cgs.server.services.CgsService.CURRENT_VERSION) url += cgs.server.services.CgsService.URL_CURRENT_VERSION; else if(version == cgs.server.services.CgsService.VERSION1) url += cgs.server.services.CgsService.URL_VERSION_1; else if(version == cgs.server.services.CgsService.VERSION2) url += cgs.server.services.CgsService.URL_VERSION_2; else if(version == cgs.server.services.CgsService.VERSION_DEV) url += cgs.server.services.CgsService.URL_VERSION_0;
		return url + cgs.server.challenge.ChallengeService.URL_PHP;
	}
	,__class__: cgs.server.challenge.ChallengeService
});
cgs.server.data = {};
cgs.server.data.GroupData = function() {
	this._id = 0;
	this._userUids = new Array();
};
cgs.server.data.GroupData.__name__ = true;
cgs.server.data.GroupData.prototype = {
	setId: function(value) {
		this._id = value;
	}
	,getId: function() {
		return this._id;
	}
	,addUserUid: function(uid) {
		var uidIndex = Lambda.indexOf(this._userUids,uid);
		if(uidIndex < 0) this._userUids.push(uid);
	}
	,setUserUids: function(value) {
		this._userUids = value.slice();
	}
	,getUserUids: function() {
		return this._userUids.slice();
	}
	,__class__: cgs.server.data.GroupData
};
cgs.server.data.IGroupData = function() { };
cgs.server.data.IGroupData.__name__ = true;
cgs.server.data.IGroupData.prototype = {
	__class__: cgs.server.data.IGroupData
};
cgs.server.data.TosData = function() {
	this._terms = new haxe.ds.StringMap();
};
cgs.server.data.TosData.__name__ = true;
cgs.server.data.TosData.prototype = {
	getTosData: function(tosKey,languageCode,version) {
		if(version == null) version = -1;
		if(languageCode == null) languageCode = "en";
		var tos = null;
		if(this._terms.exists(tosKey)) {
			var tosLanData = this._terms.get(tosKey);
			tos = tosLanData.getTosData(languageCode,version);
		}
		return tos;
	}
	,containsTos: function(tosKey,languageCode,version) {
		if(version == null) version = -1;
		if(languageCode == null) languageCode = "en";
		var containsTos = false;
		if(this._terms.exists(tosKey)) {
			var tosLanData = this._terms.get(tosKey);
			containsTos = tosLanData.containsTos(languageCode,version);
		}
		return containsTos;
	}
	,addTosDataItems: function(items) {
		var _g = 0;
		while(_g < items.length) {
			var item = items[_g];
			++_g;
			this.addTosItemData(item);
		}
	}
	,addTosItemData: function(data) {
		var tosKey = data.getKey();
		var lanTerms = this._terms.get(tosKey);
		if(lanTerms == null) {
			lanTerms = new cgs.server.data._TosData.TosLanguageItems();
			this._terms.set(tosKey,lanTerms);
			lanTerms;
		}
		lanTerms.addTosItemData(data);
	}
	,__class__: cgs.server.data.TosData
};
cgs.server.data._TosData = {};
cgs.server.data._TosData.TosLanguageItems = function() {
	this._terms = new haxe.ds.StringMap();
};
cgs.server.data._TosData.TosLanguageItems.__name__ = true;
cgs.server.data._TosData.TosLanguageItems.prototype = {
	getTosData: function(languageCode,version) {
		var terms = null;
		if(this._terms.exists(languageCode)) {
			var versionTerms = this._terms.get(languageCode);
			terms = versionTerms.getTosData(version);
		}
		return terms;
	}
	,containsTos: function(languageCode,version) {
		var containsTerms = false;
		if(this._terms.exists(languageCode)) {
			var versionTerms = this._terms.get(languageCode);
			containsTerms = versionTerms.containsTos(version);
		}
		return containsTerms;
	}
	,addTosItemData: function(data) {
		var languageCode = data.getLanguageCode();
		var termsVersion = this._terms.get(languageCode);
		if(termsVersion == null) {
			termsVersion = new cgs.server.data._TosData.TosVersionItems();
			this._terms.set(languageCode,termsVersion);
			termsVersion;
		}
		termsVersion.addTosItemData(data);
	}
	,__class__: cgs.server.data._TosData.TosLanguageItems
};
cgs.server.data._TosData.TosVersionItems = function() {
	this._terms = new haxe.ds.IntMap();
};
cgs.server.data._TosData.TosVersionItems.__name__ = true;
cgs.server.data._TosData.TosVersionItems.prototype = {
	getTosData: function(version) {
		if(version == -1) return this._latestVersion;
		return this._terms.get(version);
	}
	,containsTos: function(version) {
		if(version == -1) return this._latestVersion != null;
		return this._terms.exists(version);
	}
	,addTosItemData: function(data) {
		var key = data.getVersion();
		this._terms.set(key,data);
		if(data.isLatestVersion()) this._latestVersion = data;
	}
	,__class__: cgs.server.data._TosData.TosVersionItems
};
cgs.server.data.TosItemData = function() {
	this._version = 0;
	this._latestVersion = 0;
};
cgs.server.data.TosItemData.__name__ = true;
cgs.server.data.TosItemData.prototype = {
	getBody: function() {
		return this._terms;
	}
	,getMd5Hash: function() {
		return haxe.crypto.Md5.encode(this.getHashString());
	}
	,getHashString: function() {
		var value = "";
		if(this.hasHeader()) value += this._termsHeader;
		value += this._terms;
		if(this.hasFooter()) value += this._termsFooter;
		return value;
	}
	,hasHeader: function() {
		if(this._termsHeader == null) return false;
		return this._termsHeader.length > 0;
	}
	,getHeader: function() {
		return this._termsHeader;
	}
	,hasFooter: function() {
		if(this._termsFooter == null) return false;
		return this._termsFooter.length > 0;
	}
	,getFooter: function() {
		return this._termsFooter;
	}
	,getHtmlHeader: function() {
		return this._htmlTermsHeader;
	}
	,getHtmlBody: function() {
		return this._htmlTerms;
	}
	,getHtmlFooter: function() {
		return this._htmlTermsFooter;
	}
	,hasTosLink: function() {
		return this._linkKey != null;
	}
	,getLinkTosKey: function() {
		return this._linkKey;
	}
	,getLinkText: function() {
		return this._linkText;
	}
	,isLatestVersion: function() {
		return this._version == this._latestVersion;
	}
	,getKey: function() {
		return this._key;
	}
	,getVersion: function() {
		return this._version;
	}
	,getLanguageCode: function() {
		return this._lanCode;
	}
	,parseObjectData: function(data) {
		this._key = data.tos_key;
		this._version = data.version;
		this._lanCode = data.language_code;
		this._termsHeader = data.header;
		this._terms = data.body;
		this._termsFooter = data.footer;
		this._htmlTermsHeader = data.html_header;
		this._htmlTerms = data.html_body;
		this._htmlTermsFooter = data.html_footer;
		if(Object.prototype.hasOwnProperty.call(data,"latest_version")) this._latestVersion = data.latest_version;
		if(Object.prototype.hasOwnProperty.call(data,"link_tos_key")) this._linkKey = data.link_tos_key;
		if(Object.prototype.hasOwnProperty.call(data,"link_text")) this._linkText = data.link_text;
	}
	,__class__: cgs.server.data.TosItemData
};
cgs.server.data.UserAuthData = function() {
	this._groupId = 0;
	this._extSourceId = 0;
	this._roleId = 0;
	this._memId = 0;
};
cgs.server.data.UserAuthData.__name__ = true;
cgs.server.data.UserAuthData.prototype = {
	setUserData: function(data) {
		this._userData = data;
	}
	,getUserData: function() {
		return this._userData;
	}
	,getUid: function() {
		return this._uid;
	}
	,getExternalId: function() {
		return this._externalId;
	}
	,getExternalSourceId: function() {
		return this._extSourceId;
	}
	,getGroupId: function() {
		return this._groupId;
	}
	,parseJsonData: function(data) {
		if(Object.prototype.hasOwnProperty.call(data,"mem_id")) this._memId = data.mem_id;
		if(Object.prototype.hasOwnProperty.call(data,"uid")) this._uid = data.uid; else if(Object.prototype.hasOwnProperty.call(data,"member_uid")) this._uid = data.member_uid;
		if(Object.prototype.hasOwnProperty.call(data,"ext_id")) this._externalId = data.ext_id;
		if(Object.prototype.hasOwnProperty.call(data,"role_id")) this._roleId = data.role_id;
		if(Object.prototype.hasOwnProperty.call(data,"mem_email")) this._email = data.mem_email;
		if(Object.prototype.hasOwnProperty.call(data,"group_id")) this._groupId = data.group_id;
		if(Object.prototype.hasOwnProperty.call(data,"ext_s_id")) this._extSourceId = data.ext_s_id;
	}
	,__class__: cgs.server.data.UserAuthData
};
cgs.server.data.UserData = function() {
	this._type = 0;
	this._loggingType = 0;
	this._lastName = "";
	this._firstName = "";
	this._externalSourceId = 0;
	this._memberId = 0;
	this._groupIds = [];
};
cgs.server.data.UserData.__name__ = true;
cgs.server.data.UserData.prototype = {
	isStudent: function() {
		return this._type == cgs.server.data.UserData.STUDENT;
	}
	,getTeacherUid: function() {
		return this._teacherUid;
	}
	,setUid: function(value) {
		this._uid = value;
	}
	,getUid: function() {
		return this._uid;
	}
	,getExternalId: function() {
		return this._externalId;
	}
	,setMemberId: function(value) {
		this._memberId = value;
	}
	,getMemberId: function() {
		return this._memberId;
	}
	,getName: function() {
		return this._firstName + " " + this._lastName;
	}
	,setFirstName: function(value) {
		this._firstName = value;
	}
	,getFirstName: function() {
		return this._firstName;
	}
	,setLastName: function(value) {
		this._lastName = value;
	}
	,getLastName: function() {
		return this._lastName;
	}
	,getType: function() {
		return this._type;
	}
	,getTypeString: function() {
		return "" + this._type;
	}
	,getGroupIds: function() {
		return this._groupIds.slice();
	}
	,getLoggingType: function() {
		return this._loggingType;
	}
	,testDuplicateName: function(student) {
		return this.compareStrings(student.getFirstName(),this._firstName) && this.compareStrings(student.getLastName(),this._lastName);
	}
	,compareStrings: function(stringA,stringB) {
		if(stringA == null && stringB == null) return true; else if(stringA == null || stringB == null) return false; else return stringA.toLowerCase() == stringB.toLowerCase();
	}
	,parseGroupData: function(data) {
	}
	,parseJsonData: function(data) {
		if(Object.prototype.hasOwnProperty.call(data,"mem_id")) this._memberId = data.mem_id;
		if(Object.prototype.hasOwnProperty.call(data,"uid")) this._uid = data.uid; else if(Object.prototype.hasOwnProperty.call(data,"member_uid")) this._uid = data.member_uid;
		if(Object.prototype.hasOwnProperty.call(data,"role_id")) this._type = data.role_id;
		if(Object.prototype.hasOwnProperty.call(data,"ext_id")) this._externalId = data.ext_id;
		if(Object.prototype.hasOwnProperty.call(data,"ext_s_id")) this._externalSourceId = data.ext_s_id;
		if(Object.prototype.hasOwnProperty.call(data,"mem_email")) this._email = data.mem_email;
		if(Object.prototype.hasOwnProperty.call(data,"mem_logging_type")) this._loggingType = data.mem_logging_type;
		if(Object.prototype.hasOwnProperty.call(data,"teacher_uid")) this._teacherUid = data.teacher_uid;
	}
	,createJsonData: function() {
		var data = { };
		return data;
	}
	,__class__: cgs.server.data.UserData
};
cgs.server.data.UserDataManager = function() {
	this._userData = new haxe.ds.StringMap();
	this._extUserData = new haxe.ds.StringMap();
	this._groupData = new haxe.ds.IntMap();
	this._userHomeplayData = new haxe.ds.StringMap();
};
cgs.server.data.UserDataManager.__name__ = true;
cgs.server.data.UserDataManager.prototype = {
	containsUser: function(uid) {
		return this._userData.exists(uid);
	}
	,containsUserWithExternalId: function(id) {
		return this._extUserData.exists(id);
	}
	,getUserData: function(uid) {
		return this._userData.get(uid);
	}
	,getUserDataByExternalId: function(id) {
		return this._extUserData.get(id);
	}
	,addUserData: function(data) {
		var key = data.getUid();
		this._userData.set(key,data);
		var key1 = data.getExternalId();
		this._extUserData.set(key1,data);
	}
	,addUserHomeplayData: function(data,userUid) {
		if(data == null) return;
		this._userHomeplayData.set(userUid,data);
	}
	,getUserHomeplayData: function(uid) {
		return this._userHomeplayData.get(uid);
	}
	,addGroupData: function(data) {
		var key = data.getId();
		this._groupData.set(key,data);
	}
	,getGroupData: function(id) {
		return this._groupData.get(id);
	}
	,__class__: cgs.server.data.UserDataManager
};
cgs.server.data.UserTosStatus = function(tosData,acceptTerms) {
	this._tosData = tosData;
	this._acceptTerms = this._origAcceptTerms = acceptTerms;
};
cgs.server.data.UserTosStatus.__name__ = true;
cgs.server.data.UserTosStatus.prototype = {
	setTosData: function(value) {
		this._tosData = value;
	}
	,useLinkedTerms: function() {
		if(this.hasTosLink()) {
			var newAcceptTerms = this._tosData.getTosData(this._acceptTerms.getLinkTosKey());
			this._acceptTerms = newAcceptTerms;
		}
	}
	,isAcceptanceRequired: function() {
		return this._acceptTerms != null;
	}
	,getAccepted: function() {
		return this._accepted;
	}
	,updateAcceptance: function(accept) {
		this._accepted = accept;
	}
	,termsAccepted: function() {
		this._accepted = true;
	}
	,termsDeclined: function() {
		this._accepted = false;
	}
	,hasTosLink: function() {
		if(this._acceptTerms != null) return this._acceptTerms.hasTosLink(); else return false;
	}
	,getTosKey: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getKey(); else return "";
	}
	,getTosVersion: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getVersion(); else return 0;
	}
	,getLinkTosText: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getLinkText(); else return null;
	}
	,getTosLanguageCode: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getLanguageCode(); else return "";
	}
	,getTosMd5Hash: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getMd5Hash(); else return "";
	}
	,hasHeader: function() {
		if(this._acceptTerms != null) return this._acceptTerms.hasHeader(); else return false;
	}
	,hasFooter: function() {
		if(this._acceptTerms != null) return this._acceptTerms.hasFooter(); else return false;
	}
	,getTermsBody: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getBody(); else return "";
	}
	,getTermsHeader: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getHeader(); else return "";
	}
	,getTermsFooter: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getFooter(); else return "";
	}
	,getHtmlTermsBody: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getHtmlBody(); else return "";
	}
	,getHtmlTermsHeader: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getHtmlHeader(); else return "";
	}
	,getHtmlTermsFooter: function() {
		if(this._acceptTerms != null) return this._acceptTerms.getHtmlFooter(); else return "";
	}
	,__class__: cgs.server.data.UserTosStatus
};
cgs.server.logging = {};
cgs.server.logging.GameServerData = $hx_exports.cgs.server.logging.GameServerData = function() {
	this._logPriority = 0;
	this._experimentId = 0;
	this._tosServerVersion = 0;
	this._extAppId = 0;
	this._assignmentSequenceId = 0;
	this._questSequenceId = 0;
	this._sessionSequenceId = 0;
	this._playCount = 0;
	this._lid = -1;
	this._tid = -1;
	this._eid = -1;
	this._cid = 0;
	this._vid = 0;
	this._gid = 0;
	this._uid = "";
	this._userName = "";
	this._dataLevel = 0;
	this._encoding = 0;
	this._skeyHashVersion = 1;
	this._conditionId = -1;
	this._serverVersion = 0;
	this._sessionSequenceId = 0;
	this._questSequenceId = 0;
	this._assignmentSequenceId = 0;
};
cgs.server.logging.GameServerData.__name__ = true;
cgs.server.logging.GameServerData.getInstance = function() {
	if(cgs.server.logging.GameServerData._instance == null) cgs.server.logging.GameServerData._instance = new cgs.server.logging.GameServerData();
	return cgs.server.logging.GameServerData._instance;
};
cgs.server.logging.GameServerData.prototype = {
	setExperimentId: function(value) {
		this._experimentId = value;
	}
	,getExperimentId: function() {
		return this._experimentId;
	}
	,isExperimentIdValid: function() {
		return this._experimentId >= 0;
	}
	,setServerTag: function(value) {
		this._serverTag = value;
	}
	,getServerTag: function() {
		return this._serverTag;
	}
	,setUserTosStatus: function(value) {
		this._userTosStatus = value;
	}
	,getUserTosStatus: function() {
		return this._userTosStatus;
	}
	,containsUserTosStatus: function() {
		return this._userTosStatus != null;
	}
	,getNextSessionSequenceId: function() {
		return ++this._sessionSequenceId;
	}
	,getNextQuestSequenceId: function() {
		return ++this._questSequenceId;
	}
	,getNextAssignmentSequenceId: function() {
		return ++this._assignmentSequenceId;
	}
	,setUserLoggingHandler: function(value) {
		this._loggingHandler = value;
	}
	,getUserLoggingHandler: function() {
		return this._loggingHandler;
	}
	,setUidCallback: function(value) {
		this._uidCallback = value;
	}
	,getUidCallback: function() {
		return this._uidCallback;
	}
	,hasUidCallback: function() {
		return this._uidCallback != null;
	}
	,hasCacheForLaterCallback: function() {
		return this._cacheForLaterCallback != null;
	}
	,setSaveCacheDataToServer: function(value) {
		this._saveCacheDataToServer = value;
	}
	,getSaveCacheDataToServer: function() {
		return this._saveCacheDataToServer;
	}
	,setCgsCache: function(value) {
		this._cgsCache = value;
	}
	,getCgsCache: function() {
		return this._cgsCache;
	}
	,hasCgsCache: function() {
		return this._cgsCache != null;
	}
	,setAuthenticateCachedStudent: function(value) {
		this._authStudentCache = value;
	}
	,getAuthenticateCachedStudent: function() {
		return this._authStudentCache;
	}
	,setUserAuthentication: function(value) {
		this._userAuth = value;
		if(this._userAuth == null) this._uid = ""; else this._uid = this._userAuth.getUid();
	}
	,getExternalSourceId: function() {
		if(this._userAuth == null) return 0; else return this._userAuth.getExternalSourceId();
	}
	,setExternalAppId: function(value) {
		this._extAppId = value;
	}
	,getExternalAppId: function() {
		return this._extAppId;
	}
	,setServerVersion: function(value) {
		this._serverVersion = value;
	}
	,getServerVersion: function() {
		return this._serverVersion;
	}
	,isVersion1: function() {
		return this._serverVersion == cgs.server.CGSServerProps.VERSION1;
	}
	,atLeastVersion1: function() {
		return this._serverVersion >= cgs.server.CGSServerProps.VERSION1;
	}
	,isVersion2: function() {
		return this._serverVersion == 2;
	}
	,atLeastVersion2: function() {
		return this._serverVersion >= 2;
	}
	,getLegacyMode: function() {
		return this._legacyMode;
	}
	,setLegacyMode: function(value) {
		this._legacyMode = value;
	}
	,setTimeUrl: function(value) {
		this._timeUrl = value;
	}
	,getTimeUrl: function() {
		if(this._timeUrl != null) return this._timeUrl; else return cgs.server.CGSServerConstants.TIME_URL;
	}
	,setServerURL: function(value) {
		this._serverURL = value;
	}
	,getServerURL: function() {
		return this._serverURL;
	}
	,setAbTestingURL: function(value) {
		this._abTestingURL = value;
	}
	,getAbTestingURL: function() {
		return this._abTestingURL;
	}
	,getIntegrationURL: function() {
		return this._integrationURL;
	}
	,setIntegrationURL: function(value) {
		this._integrationURL = value;
	}
	,setUseDevelopmentServer: function(value) {
		this._useDevServer = value;
	}
	,getUseDevelopmentServer: function() {
		return this._useDevServer;
	}
	,setSkeyHashVersion: function(value) {
		this._skeyHashVersion = value;
	}
	,getSkeyHashVersion: function() {
		return this._skeyHashVersion;
	}
	,getDataEncoding: function() {
		return this._encoding;
	}
	,setDataEncoding: function(value) {
		this._encoding = value;
	}
	,getDataLevel: function() {
		return this._dataLevel;
	}
	,setDataLevel: function(level) {
		this._dataLevel = level;
	}
	,setLogPriority: function(value) {
		this._logPriority = value;
	}
	,getLogPriority: function() {
		return this._logPriority;
	}
	,setSkey: function(value) {
		this._skey = value;
	}
	,getSkey: function() {
		return this._skey;
	}
	,createSkeyHash: function(value) {
		return haxe.crypto.Md5.encode(value + this._skey);
	}
	,setUserName: function(value) {
		this._userName = value;
	}
	,getUserName: function() {
		return this._userName;
	}
	,isConditionIdValid: function() {
		return this._conditionId >= 0;
	}
	,setConditionId: function(cdid) {
		this._conditionId = cdid;
	}
	,getConditionId: function() {
		return this._conditionId;
	}
	,getUserPlayCount: function() {
		return this._playCount;
	}
	,setUserPlayCount: function(value) {
		this._playCount = value;
	}
	,setUid: function(value) {
		this._uid = value;
	}
	,getUid: function() {
		if(this._userAuth == null) return this._uid; else return this._userAuth.getUid();
	}
	,isUidValid: function() {
		return this.getUid().length > 0;
	}
	,isSessionIdValid: function() {
		return this._sessionId != null;
	}
	,getSessionId: function() {
		return this._sessionId;
	}
	,setSessionId: function(value) {
		this._sessionId = value;
	}
	,setGameName: function(value) {
		this._g_name = value;
	}
	,getGameName: function() {
		return this._g_name;
	}
	,setGameId: function(value) {
		this._gid = value;
	}
	,getGameId: function() {
		return this._gid;
	}
	,getSvid: function() {
		return this._skeyHashVersion;
	}
	,setVersionId: function(value) {
		this._vid = value;
	}
	,getVersionId: function() {
		return this._vid;
	}
	,setCid: function(value) {
		this._cid = value;
	}
	,getCid: function() {
		return this._cid;
	}
	,isEventIDValid: function() {
		return this._eid >= 0;
	}
	,setEid: function(value) {
		this._eid = value;
	}
	,getEid: function() {
		return this._eid;
	}
	,isTypeIDValid: function() {
		return this._tid >= 0;
	}
	,setTid: function(value) {
		this._tid = value;
	}
	,getTid: function() {
		return this._tid;
	}
	,isLevelIDValid: function() {
		return this._lid >= 0;
	}
	,setLid: function(value) {
		this._lid = value;
	}
	,getLid: function() {
		return this._lid;
	}
	,isSessionIDValid: function() {
		return this._sessionId != null;
	}
	,setSid: function(value) {
		this._sessionId = value;
	}
	,getSid: function() {
		return this._sessionId;
	}
	,setLessonId: function(id) {
		this._lessonId = id;
	}
	,getLessonId: function() {
		return this._lessonId;
	}
	,getTosServerVersion: function() {
		return this._tosServerVersion;
	}
	,setTosServerVersion: function(value) {
		this._tosServerVersion = value;
	}
	,isSWFDomainValid: function() {
		return this._swfDomain != null;
	}
	,getSwfDomain: function() {
		return this._swfDomain;
	}
	,setSwfDomain: function(value) {
		this._swfDomain = value;
	}
	,setUseProxy: function(value) {
		this._useProxy = value;
	}
	,useProxy: function() {
		return this._useProxy;
	}
	,getProxyUrl: function() {
		return this._proxyUrl;
	}
	,setProxyUrl: function(value) {
		this._proxyUrl = value;
	}
	,__class__: cgs.server.logging.GameServerData
};
cgs.server.logging.ILogRequestHandler = function() { };
cgs.server.logging.ILogRequestHandler.__name__ = true;
cgs.server.logging.ILogRequestHandler.prototype = {
	__class__: cgs.server.logging.ILogRequestHandler
};
cgs.server.logging.ISequenceIdGenerator = function() { };
cgs.server.logging.ISequenceIdGenerator.__name__ = true;
cgs.server.logging.ISequenceIdGenerator.prototype = {
	__class__: cgs.server.logging.ISequenceIdGenerator
};
cgs.server.logging.IUserInitializationHandler = function() { };
cgs.server.logging.IUserInitializationHandler.__name__ = true;
cgs.server.logging.IUserInitializationHandler.prototype = {
	__class__: cgs.server.logging.IUserInitializationHandler
};
cgs.server.logging.LogData = function() {
	this._propertyDependencies = new Array();
};
cgs.server.logging.LogData.__name__ = true;
cgs.server.logging.LogData.prototype = {
	getDependencies: function() {
		var depends = new Array();
		var _g = 0;
		var _g1 = this._propertyDependencies;
		while(_g < _g1.length) {
			var depend = _g1[_g];
			++_g;
			depends.push(depend);
		}
		return depends;
	}
	,ready: function() {
		var _g = 0;
		var _g1 = this._propertyDependencies;
		while(_g < _g1.length) {
			var depen = _g1[_g];
			++_g;
			if(!depen.isReady()) return false;
		}
		return true;
	}
	,setPropertyValue: function(key,value) {
		var _g = 0;
		var _g1 = this._propertyDependencies;
		while(_g < _g1.length) {
			var propDepen = _g1[_g];
			++_g;
			if(propDepen.getKey() == key) propDepen.setValue(value);
		}
	}
	,addPropertyDependcy: function(propertyKey) {
		var propDependency = new cgs.http.requests.RequestPropertyDependency(propertyKey);
		this._propertyDependencies.push(propDependency);
		return propDependency;
	}
	,__class__: cgs.server.logging.LogData
};
cgs.server.logging.UserInitHandler = function(cgsUser,props,serverApi) {
	this._serverCacheVersion = 0;
	this._gradeLevel = 0;
	this._tosServerVersion = 0;
	this._timeoutMs = 30000;
	this._uidRequestId = 0;
	this._sessionRequestId = 0;
	this._user = cgsUser;
	this._uidCallback = props.getUidValidCallback();
	this._pageloadCallback = props.getPageLoadCallback();
	this._completeCallback = props.getCompleteCallback();
	this._logPageLoad = props.getLogPageLoad();
	this._pageloadDetails = props.getPageLoadDetails();
	this._loadUserData = props.getSaveCacheDataToServer();
	this._cgsCache = props.getCgsCache();
	this._cacheUid = props.getCacheUid();
	this._forceUid = props.getForceUid();
	this._abTester = props.getAbTester();
	this._loadAbTests = props.getLoadAbTests();
	this._userTosType = props.getTosKey();
	this._userTosExempt = props.getTosExempt();
	this._languageCode = props.getLanguageCode();
	this._tosServerVersion = props.getTosServerVersion();
	this._existingAbTestsOnly = props.getLoadExistingAbTests();
	this._loadHomeplays = props.getLoadHomeplays();
	this._serverApi = serverApi;
	this._serverCacheVersion = props.getServerCacheVersion();
	this._cacheSaveKey = props.getCacheSaveKey();
};
cgs.server.logging.UserInitHandler.__name__ = true;
cgs.server.logging.UserInitHandler.__interfaces__ = [cgs.server.logging.IUserInitializationHandler];
cgs.server.logging.UserInitHandler.prototype = {
	setGradeLevel: function(value) {
		if(value != 0) {
			this._gradeLevel = value;
			this._gradeLevelSet = true;
		}
	}
	,getSessionRequestId: function() {
		return this._sessionRequestId;
	}
	,getUidRequestId: function() {
		return this._uidRequestId;
	}
	,getCompleteCallback: function() {
		return this._completeCallback;
	}
	,setCompleteCallback: function(value) {
		this._completeCallback = value;
	}
	,setTimeValidCallback: function(callback) {
		this._timeValidCallback = callback;
	}
	,failed: function() {
		var homeplaysFailed;
		if(this._homeplaysResponse != null) homeplaysFailed = this._homeplaysResponse.failed(); else homeplaysFailed = false;
		return this._uidLoadFailed || this._pageloadFailed || this._userDataLoadFailed || this._abTestsLoadFailed || homeplaysFailed;
	}
	,initiliazeUserData: function(server) {
		var _g = this;
		this._server = server;
		this._initTimestamp = haxe.Timer.stamp() * 1000;
		this._uidRequestId = server.requestUid(function(response) {
			cgs.logger.Logger.log("Flash: User Uid Loaded, " + response.getUid());
			_g._uidResponse = response;
			_g._uidLoadFailed = response.failed();
			if(_g._uidLoadFailed) console.log("UserInitHandler: Uid request failed");
			_g._uid = response.getUid();
			_g._uidLoaded = true;
			if(_g._uidCallback != null) _g._uidCallback(_g._uidResponse);
			_g.testCompleted();
		},this._cacheUid,this._forceUid);
		this.makeInitLoggingCalls();
	}
	,isUidValid: function() {
		return this._uidLoaded && !this._uidLoadFailed;
	}
	,isSessionValid: function() {
		return this._pageloadLogged && !this._pageloadFailed;
	}
	,isAuthenticated: function(serverAuthFunction,server,completeCallback,saveCacheDataToServer) {
		if(saveCacheDataToServer == null) saveCacheDataToServer = true;
		this.handleAuthUser(serverAuthFunction,server,completeCallback,saveCacheDataToServer);
	}
	,authenticateUser: function(name,password,authKey,serverAuthFunction,server,completeCallback,saveCacheDataToServer) {
		if(saveCacheDataToServer == null) saveCacheDataToServer = true;
		this.authenticateUserName(name,password,authKey,serverAuthFunction,server,completeCallback);
	}
	,handleAuthUser: function(serverAuthFunction,server,completeCallback,saveCacheDataToServer,name,password,authKey) {
		if(saveCacheDataToServer == null) saveCacheDataToServer = true;
		this._authUser = true;
		this._server = server;
		this._initTimestamp = haxe.Timer.stamp() * 1000;
		if(completeCallback != null) this._completeCallback = completeCallback;
		if(name == null || password == null && authKey == null) this._uidRequestId = serverAuthFunction($bind(this,this.handleUserAuthentication)); else if(this._gradeLevelSet) {
			this._uidRequestId = serverAuthFunction(name,password,authKey,$bind(this,this.handleUserAuthentication),this._gradeLevel);
			this._gradeLevel = 0;
			this._gradeLevelSet = false;
		} else this._uidRequestId = serverAuthFunction(name,password,authKey,$bind(this,this.handleUserAuthentication));
	}
	,handleUserAuthentication: function(status,uid) {
		this._userAuthStatus = status;
		this._uid = uid;
		this._uidLoaded = true;
		this._uidLoadFailed = status.failed();
		if(!this._uidLoadFailed) this.makeInitLoggingCalls();
		if(this._uidCallback != null) {
			var response = new cgs.server.responses.UidResponseStatus();
			response.setUid(this._uid);
			this._uidCallback(response);
		}
		this.testCompleted();
	}
	,authenticateUserName: function(name,password,authKey,serverAuthFunction,server,completeCallback) {
		this.handleAuthUser(serverAuthFunction,server,completeCallback,true,name,password,authKey);
	}
	,handleCompleteCallback: function() {
		if(this._completeCallback == null) return;
		var userResponse = new cgs.server.responses.CgsUserResponse(this._user);
		userResponse.setUidResponse(this._uidResponse);
		userResponse.setAuthorizationResponse(this._userAuthStatus);
		userResponse.setPageloadResponse(this._pageloadResponse);
		userResponse.setAbTestingResponse(this._abTestsResponse);
		userResponse.setDataLoadResponse(this._userDataResponse);
		this._completeCallback(userResponse);
	}
	,makeInitLoggingCalls: function() {
		var _g = this;
		this._server.isServerTimeValid(this._timeValidCallback);
		if(this._logPageLoad) this._sessionRequestId = this._server.logPageLoad(this._pageloadDetails,function(response) {
			_g._pageloadResponse = response;
			_g._pageloadFailed = response.failed();
			if(_g._pageloadFailed) {
			}
			_g._pageloadLogged = true;
			if(_g._pageloadCallback != null) _g._pageloadCallback(response);
			_g.handlePageLoadComplete();
			if(_g._userTosExempt) _g._server.exemptUserFromTos();
			cgs.logger.Logger.log("Flash: Testing UserInit complete from PageLoad Complete");
			_g.testCompleted();
		});
		if(this._loadUserData) {
			if(this._serverCacheVersion == 2) this._server.loadGameSaveData($bind(this,this.handleServerDataLoaded),this._cacheSaveKey); else this._server.loadGameData($bind(this,this.handleServerDataLoaded));
		}
		if(this.getLoadTosStatus()) this._server.loadUserTosStatus(this._userTosType,function(response1) {
			_g._tosResponseStatus = response1;
			_g.testCompleted();
		},this._languageCode);
		if(this.getLoadHomeplays()) this._server.retrieveUserAssignments(function(response2) {
			_g._homeplaysResponse = response2;
			_g.testCompleted();
		});
	}
	,handleServerDataLoaded: function(response) {
		this._userDataResponse = response;
		this._userDataLoadFailed = response.failed();
		if(this._userDataLoadFailed) {
		}
		this._userDataLoaded = true;
		if(this._cgsCache != null) this._cgsCache.registerUser(this._uid,this._loadUserData,this._serverCacheVersion,response.getUserGameData(),this._serverApi);
		cgs.logger.Logger.log("Flash: Testing UserInit complete from ServerDataLoaded");
		this.testCompleted();
	}
	,handlePageLoadComplete: function() {
		var _g = this;
		if(this._loadAbTests) {
			var playCount = this._server.getCurrentGameServerData().getUserPlayCount();
			var exitingAbTests = this._existingAbTestsOnly && playCount > 1;
			this._abTester.loadTestConditions(function(response) {
				_g._abTestsLoadFailed = response.failed();
				_g._abTestsLoaded = !response.failed();
				if(_g._abTestsCompleteCallback != null) _g._abTestsCompleteCallback(response.failed());
				_g.testCompleted();
			},exitingAbTests);
		}
	}
	,getLoadTosStatus: function() {
		return !this._userTosExempt && this._userTosType != null;
	}
	,getTosStatusLoaded: function() {
		return this._tosResponseStatus != null;
	}
	,getHomeplaysLoaded: function() {
		return this._homeplaysResponse != null;
	}
	,getLoadHomeplays: function() {
		return this._loadHomeplays && this._authUser;
	}
	,getHomeplayResponse: function() {
		return this._homeplaysResponse;
	}
	,testCompleted: function() {
		if(this.failed() || this._uidLoaded && (!this._logPageLoad || this._pageloadLogged) && (!this._loadUserData || this._userDataLoaded) && (!this.getLoadTosStatus() || this.getTosStatusLoaded()) && (!this._loadAbTests || this._abTestsLoaded) && (!this.getLoadHomeplays() || this.getHomeplaysLoaded())) {
			if(this.failed()) console.log("UserInitHandler: User init failed");
			cgs.logger.Logger.log("Flash: Handling UserInit complete callback");
			this.handleCompleteCallback();
		}
	}
	,__class__: cgs.server.logging.UserInitHandler
};
cgs.server.logging.UserLoggingHandler = function(server,user,props,bufferedHandlerClass) {
	this._sessionRequestId = -1;
	this._uidRequestId = -1;
	this._questSequenceId = 0;
	this._sessionSequenceId = 0;
	this._questGameID = -1;
	this._localQuestId = 0;
	this._openQuests = 0;
	console.log("Creating UserLoggingHandler");
	this._server = server;
	this._actionBufferHandlerClass = bufferedHandlerClass;
	this._sessionSequenceId = 0;
	this._questSequenceId = 0;
	this._questLogMap = new haxe.ds.IntMap();
	this._completeQuestLogs = new Array();
	if(user != null) this.createUserInitHandler(user,props);
};
cgs.server.logging.UserLoggingHandler.__name__ = true;
cgs.server.logging.UserLoggingHandler.__interfaces__ = [cgs.server.logging.ILogRequestHandler,cgs.server.logging.ISequenceIdGenerator];
cgs.server.logging.UserLoggingHandler.prototype = {
	isProductionRelease: function() {
		if(this._server != null) return this._server.isProductionRelease(); else return false;
	}
	,getSessionRequestDependency: function() {
		var sessionRequestId;
		if(this._initHandler != null) sessionRequestId = this._initHandler.getSessionRequestId(); else sessionRequestId = this._sessionRequestId;
		if(this._sessionDependency == null && sessionRequestId >= 0) this._sessionDependency = new cgs.http.requests.RequestDependency(sessionRequestId);
		return this._sessionDependency;
	}
	,setUidRequestId: function(value) {
		this._uidRequestId = value;
	}
	,getUidRequestDependency: function() {
		var uidRequestId;
		if(this._initHandler != null) uidRequestId = this._initHandler.getUidRequestId(); else uidRequestId = this._uidRequestId;
		if(this._uidDependency == null && uidRequestId >= 0) this._uidDependency = new cgs.http.requests.RequestDependency(uidRequestId,true);
		return this._uidDependency;
	}
	,createUserInitHandler: function(user,props) {
		this._initCompleteCallback = props.getCompleteCallback();
		this._uidCallback = props.getUidValidCallback();
		this._pageloadCallback = props.getPageLoadCallback();
		props.setCompleteCallback($bind(this,this.handleUserInitComplete));
		props.setUidValidCallback($bind(this,this.handleUidValid));
		props.setPageLoadCallback($bind(this,this.handlePageloadComplete));
		var initHandler = new cgs.server.logging.UserInitHandler(user,props,this._server);
		initHandler.setTimeValidCallback($bind(this,this.isServerTimeValid));
		this._initHandler = initHandler;
		props.setCompleteCallback(this._initCompleteCallback);
		props.setUidValidCallback(this._uidCallback);
		props.setPageLoadCallback(this._pageloadCallback);
	}
	,isUserLoggingDisabled: function() {
		return false;
	}
	,getServerTime: function() {
		return this._server.getServerTime();
	}
	,getNextSessionSequenceId: function() {
		return ++this._sessionSequenceId;
	}
	,getNextQuestSequenceId: function() {
		return ++this._questSequenceId;
	}
	,initializeUserData: function(server) {
		this._initHandler.initiliazeUserData(server);
	}
	,isAuthenticated: function(serverAuthFunction,server,completeCallback,saveCacheDataToServer) {
		this._initHandler.isAuthenticated(serverAuthFunction,server,completeCallback,saveCacheDataToServer);
	}
	,authenticateUser: function(name,password,authKey,gradeLevel,serverAuthFunction,server,completeCallback,saveCacheDataToServer) {
		if(saveCacheDataToServer == null) saveCacheDataToServer = true;
		this._initHandler.setGradeLevel(gradeLevel);
		this._initHandler.authenticateUser(name,password,authKey,serverAuthFunction,server,completeCallback,saveCacheDataToServer);
	}
	,authenticateUserName: function(name,password,authKey,serverAuthFunction,server,completeCallback) {
		if(js.Boot.__instanceof(this._initHandler,cgs.server.logging.UserInitHandler)) (js.Boot.__cast(this._initHandler , cgs.server.logging.UserInitHandler)).authenticateUserName(name,password,authKey,serverAuthFunction,server,completeCallback); else this._initHandler.authenticateUser(name,password,authKey,serverAuthFunction,server,completeCallback,false);
	}
	,handleUserInitComplete: function(response) {
		if(this._initCompleteCallback != null) this._initCompleteCallback(response);
		this._initCompleteCallback = null;
	}
	,handleAuthenticationComplete: function(response) {
		if(this._initCompleteCallback != null) this._initCompleteCallback(response);
		this._initCompleteCallback = null;
	}
	,handleUidValid: function(response) {
		if(this._uidCallback != null) this._uidCallback(response);
		this._uidCallback = null;
	}
	,handlePageloadComplete: function(response) {
		if(this._pageloadCallback != null) this._pageloadCallback(response);
		this._pageloadCallback = null;
	}
	,serverTimeValid: function() {
		this._serverTimeLoaded = true;
	}
	,isServerTimeValid: function() {
		return this._serverTimeLoaded;
	}
	,requestUserTestConditions: function(existing,callback) {
		if(existing == null) existing = false;
		var serverData = this._server.getCurrentGameServerData();
		var callbackRequest = new cgs.server.logging.requests.CallbackRequest(callback,serverData);
		var message = this._server.getServerMessage();
		message.injectParams();
		message.injectExperimentId();
		var method;
		if(existing) method = cgs.server.abtesting.ABTesterConstants.GET_EXISTING_USER_CONDITIONS; else method = cgs.server.abtesting.ABTesterConstants.GET_USER_CONDITIONS;
		var request = this._server.createAbRequest(method,$bind(this,this.handleABTestConditions),message.getMessageObject(),null,callbackRequest);
		this.sendLogRequest(request);
	}
	,handleABTestConditions: function(response) {
		if(response.failed()) {
		}
		var callbackRequest = response.getPassThroughData();
		var callback = callbackRequest.getCallback();
		if(callback != null) callback(response);
	}
	,noUserConditions: function() {
		var message = this._server.getServerMessage();
		message.injectParams();
		message.injectExperimentId();
		var request = this._server.createAbRequest(cgs.server.abtesting.ABTesterConstants.NO_CONDITION_USER,$bind(this,this.handleNoConditionsResponse),message.getMessageObject());
		this.sendLogRequest(request);
	}
	,handleNoConditionsResponse: function(response) {
	}
	,logTestStart: function(testID,conditionID,detail,callback) {
		var serverData = this._server.getCurrentGameServerData();
		var message = new cgs.server.abtesting.messages.TestStatusMessage(testID,conditionID,true,detail,serverData);
		message.injectParams();
		message.injectExperimentId();
		var callbackRequest = new cgs.server.logging.requests.CallbackRequest(callback,serverData);
		var request = this._server.createAbRequest(cgs.server.abtesting.ABTesterConstants.LOG_TEST_START_END,$bind(this,this.testStartLogged),message.getMessageObject(),null,callbackRequest);
		this.sendLogRequest(request);
	}
	,testStartLogged: function(response) {
		if(response.failed()) {
		}
		var callbackRequest = response.getPassThroughData();
		var callback = callbackRequest.getCallback();
		if(callback != null) callback(response);
	}
	,logTestEnd: function(testID,conditionID,detail,callback) {
		var serverData = this._server.getCurrentGameServerData();
		var message = new cgs.server.abtesting.messages.TestStatusMessage(testID,conditionID,false,detail,serverData);
		message.injectParams();
		message.injectExperimentId();
		var callbackRequest = new cgs.server.logging.requests.CallbackRequest(callback,serverData);
		var request = this._server.createAbRequest(cgs.server.abtesting.ABTesterConstants.LOG_TEST_START_END,$bind(this,this.testEndLogged),message.getMessageObject(),null,callbackRequest);
		this.sendLogRequest(request);
	}
	,testEndLogged: function(response) {
		if(response.failed()) {
		}
		var callbackRequest = response.getPassThroughData();
		var callback = callbackRequest.getCallback();
		if(callback != null) callback(response);
	}
	,logConditionVariableStart: function(testID,conditionID,varID,resultID,time,detail,callback) {
		if(time == null) time = -1;
		var serverData = this._server.getCurrentGameServerData();
		var message = new cgs.server.abtesting.messages.ConditionVariableMessage(testID,conditionID,varID,resultID,true,time,detail,serverData);
		message.injectParams();
		message.injectExperimentId();
		var callbackRequest = new cgs.server.logging.requests.CallbackRequest(callback,serverData);
		var request = this._server.createAbRequest(cgs.server.abtesting.ABTesterConstants.LOG_CONDITION_RESULTS,$bind(this,this.conditionResultsLogged),message.getMessageObject(),null,callbackRequest);
		this.sendLogRequest(request);
	}
	,logConditionVariableResults: function(testID,conditionID,variableID,resultID,time,detail,callback) {
		if(time == null) time = -1;
		var serverData = this._server.getCurrentGameServerData();
		var message = new cgs.server.abtesting.messages.ConditionVariableMessage(testID,conditionID,variableID,resultID,false,time,detail,serverData);
		message.injectParams();
		message.injectExperimentId();
		var callbackRequest = new cgs.server.logging.requests.CallbackRequest(callback,serverData);
		var request = this._server.createAbRequest(cgs.server.abtesting.ABTesterConstants.LOG_CONDITION_RESULTS,$bind(this,this.conditionResultsLogged),message.getMessageObject(),null,callbackRequest);
		this.sendLogRequest(request);
	}
	,conditionResultsLogged: function(response) {
		var callbackRequest = response.getPassThroughData();
		var callback = callbackRequest.getCallback();
		if(response.failed()) {
		}
		if(callback != null) callback(response);
	}
	,submitUserFeedback: function(feedback,callback) {
		if(this.isUserLoggingDisabled()) return;
		var serverData = this._server.getCurrentGameServerData();
		feedback.setServerData(serverData);
		feedback.injectParams();
		var req = new cgs.server.logging.requests.CallbackRequest(callback,serverData);
		var request = this._server.createUserRequest(cgs.server.CGSServerConstants.USER_FEEDBACK,feedback,null,null,1,cgs.server.requests.ServerRequest.GET,req,$bind(this,this.handleUserInfoSentMessage));
		this.sendLogRequest(request);
	}
	,handleUserInfoSentMessage: function(response) {
		var callbackRequest = response.getPassThroughData();
		var callback = callbackRequest.getCallback();
		if(callback != null) callback(response);
	}
	,logAction: function(action,callback,multiSeqId,multiUid) {
		if(multiSeqId == null) multiSeqId = -1;
		var _g = this;
		if(this.isUserLoggingDisabled()) return;
		var message = this._server.getServerMessage();
		message.addProperty("aid",action.getActionId());
		message.addProperty("a_detail",action.getDetails());
		if(multiUid != null) message.addProperty(cgs.server.logging.UserLoggingHandler.MULTIPLAYER_UID_KEY,multiUid);
		if(multiSeqId >= 0) message.addProperty(cgs.server.logging.UserLoggingHandler.MULTIPLAYER_SEQUENCEID_KEY,multiSeqId);
		var serverData = this._server.getCurrentGameServerData();
		message.setServerData(serverData);
		message.setServerTime(this._server.getServerTime());
		var sessionSeqId = this.getNextSessionSequenceId();
		if(serverData.atLeastVersion2()) {
			message.injectSessionId();
			message.addProperty("session_seqid",sessionSeqId);
			message.injectClientTimeStamp();
		}
		if(serverData.isVersion1()) {
			message.addProperty("sessionid",serverData.getSessionId());
			message.addProperty("session_seqid",sessionSeqId);
		}
		message.injectParams();
		var request = this._server.createUserRequest(cgs.server.CGSServerConstants.ACTION_NO_QUEST,message,null,null,1,cgs.server.requests.ServerRequest.POST,null,function(response) {
			if(callback != null) callback(response); else console.log("Callback is null");
		});
		request.addRequestDependency(this._server.getUidRequestDependency());
		request.addRequestDependency(this._server.getSessionRequestDependency());
		request.addReadyHandler(function(request1) {
			request1.injectUid();
			request1.injectSessionId(_g._server.getCurrentGameServerData().getSessionId());
		});
		this.sendLogRequest(request);
	}
	,addQuestLog: function(localDqid,questLog) {
		this._questLogMap.set(localDqid,questLog);
		this._lastQuestLog = questLog;
	}
	,getQuestLog: function(localDqid) {
		if(localDqid < 0) return this._lastQuestLog;
		return this._questLogMap.get(localDqid);
	}
	,questLogCompleted: function(localDqid) {
		var returnQuestLog = null;
		if(localDqid < 0) {
			returnQuestLog = this._lastQuestLog;
			this._lastQuestLog = null;
		} else {
			returnQuestLog = this._questLogMap.get(localDqid);
			this._questLogMap.remove(localDqid);
		}
		if(returnQuestLog != null) this._completeQuestLogs.push(returnQuestLog);
		return returnQuestLog;
	}
	,getNewQuestLog: function() {
		var questLog = new cgs.server.logging.quests.QuestLogger(this._actionBufferHandlerClass,this._server,this._server.getUrlRequestHandler(),this);
		questLog.setSequenceIdGenerator(this);
		return questLog;
	}
	,startLoggingQuestActions: function(questId,dqid,localDqid) {
		if(localDqid == null) localDqid = -1;
		if(this.isUserLoggingDisabled()) return -1;
		var newLocalDqid;
		if(localDqid < 0) newLocalDqid = this.nextLocalDqid(); else newLocalDqid = localDqid;
		var questLog = this.getNewQuestLog();
		this.addQuestLog(localDqid,questLog);
		questLog.startLoggingQuestActions(questId,dqid);
		return newLocalDqid;
	}
	,endLoggingQuestActions: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		if(this.isUserLoggingDisabled()) return;
		var questLog = this.questLogCompleted(localDqid);
		if(questLog == null && !this.isProductionRelease()) throw "startLoggingQuestActions must be called prior to ending logging.";
		questLog.endLoggingQuestActions();
	}
	,logQuestStartWithDQID: function(questId,questHash,dqid,details,callback,aeSeqId,localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.localQuestStart(questId,questHash,details,callback,aeSeqId,localDqid,dqid);
	}
	,logQuestStart: function(questId,questHash,details,callback,aeSeqId,localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.localQuestStart(questId,questHash,details,callback,aeSeqId,localDqid);
	}
	,logLinkedQuestStart: function(questId,questHash,linkGameId,linkCategoryId,linkVersionId,linkConditionId,details,callback,aeSeqId,localDqid) {
		if(localDqid == null) localDqid = -1;
		if(linkConditionId == null) linkConditionId = 0;
		return this.localQuestStart(questId,questHash,details,callback,aeSeqId,localDqid,null,null,linkGameId,linkCategoryId,linkVersionId);
	}
	,logMultiplayerQuestStart: function(questId,questHash,details,parentDqid,multiSeqId,callback,aeSeqId,localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.localQuestStart(questId,questHash,details,callback,aeSeqId,localDqid,null,parentDqid,-1,-1,-1,-1,multiSeqId);
	}
	,localQuestStart: function(questId,questHash,details,callback,aeSeqId,localDqid,dqid,parentDqid,linkGameId,linkCategoryId,linkVersionId,linkConditionId,multiSeqId,homeplayId,homeplayDetails) {
		if(multiSeqId == null) multiSeqId = -1;
		if(linkConditionId == null) linkConditionId = -1;
		if(linkVersionId == null) linkVersionId = -1;
		if(linkCategoryId == null) linkCategoryId = -1;
		if(linkGameId == null) linkGameId = -1;
		if(localDqid == null) localDqid = -1;
		var context = this.createQuestStartRequest(questId,questHash,details,callback,aeSeqId,localDqid,dqid,parentDqid,linkGameId,linkCategoryId,linkVersionId,linkConditionId,multiSeqId,homeplayId,homeplayDetails);
		if(context != null) {
			context.sendRequest();
			return context.getLocalDqid();
		}
		return -1;
	}
	,createQuestStartRequest: function(questId,questHash,details,callback,aeSeqId,localDqid,dqid,parentDqid,linkGameId,linkCategoryId,linkVersionId,linkConditionId,multiSeqId,homeplayId,homeplayDetails) {
		if(multiSeqId == null) multiSeqId = -1;
		if(linkConditionId == null) linkConditionId = -1;
		if(linkVersionId == null) linkVersionId = -1;
		if(linkCategoryId == null) linkCategoryId = -1;
		if(linkGameId == null) linkGameId = -1;
		if(localDqid == null) localDqid = -1;
		if(this.isUserLoggingDisabled()) return null;
		if(localDqid < 0) localDqid = this.nextLocalDqid();
		var questLog = this.getNewQuestLog();
		this.addQuestLog(localDqid,questLog);
		var request = questLog.createLogQuestStartRequest(questId,questHash,details,callback,aeSeqId,false,parentDqid,multiSeqId,linkGameId,linkCategoryId,linkVersionId,linkConditionId,homeplayId,homeplayDetails);
		var context = new cgs.server.logging.quests.QuestLogContext(request,this._server.getUrlRequestHandler(),localDqid);
		return context;
	}
	,logForeignQuestStart: function(dqid,foreignGameId,foreignCategoryId,foreignVersionId,foreignConditionId,details,callback) {
		if(foreignConditionId == null) foreignConditionId = 0;
		if(this.isUserLoggingDisabled()) return;
		var serverData = this._server.getCurrentGameServerData();
		var message = new cgs.server.logging.messages.QuestMessage(0,details,true,null,null,serverData,this._server.getServerTime());
		message.addProperty("foreign_gid",foreignGameId);
		message.addProperty("foreign_cid",foreignCategoryId);
		message.addProperty("foreign_vid",foreignVersionId);
		message.setDqid(dqid);
		message.injectParams();
		message.setForeignQuest(true);
		var sessionSeqId = this.getNextSessionSequenceId();
		var questSeqId = this.getNextQuestSequenceId();
		if(serverData.atLeastVersion2()) {
			message.addProperty("sessionid",serverData.getSessionId());
			message.addProperty("session_seqid",sessionSeqId);
			message.addProperty("quest_seqid",questSeqId);
			message.addProperty("qaction_seqid",0);
			message.injectClientTimeStamp();
		}
		var request = this._server.createUserRequest("quest/start/",message,null,null,1,cgs.server.requests.ServerRequest.POST,callback,$bind(this,this.handleForeignQuestStartResponse));
		this.sendLogRequest(request);
	}
	,handleForeignQuestStartResponse: function(response) {
		var callback = response.getPassThroughData();
		if(callback != null) callback(response);
	}
	,logMultiplayerQuestEnd: function(details,parentDqid,multiSeqId,localDqid,callback) {
		if(localDqid == null) localDqid = -1;
		this.localLogQuestEnd(details,localDqid,callback,parentDqid,multiSeqId);
	}
	,logQuestEnd: function(details,localDqid,callback) {
		if(localDqid == null) localDqid = -1;
		this.localLogQuestEnd(details,localDqid,callback);
	}
	,localLogQuestEnd: function(details,localDqid,callback,parentDqid,multiSeqId,homeplayId,homeplayDetails,homeplayCompleted) {
		if(homeplayCompleted == null) homeplayCompleted = false;
		if(multiSeqId == null) multiSeqId = -1;
		if(localDqid == null) localDqid = -1;
		var context = this.createQuestEndRequest(details,localDqid,callback,parentDqid,multiSeqId,homeplayId,homeplayDetails,homeplayCompleted);
		if(context != null) context.sendRequest();
	}
	,createQuestEndRequest: function(details,localDqid,callback,parentDqid,multiSeqId,homeplayId,homeplayDetails,homeplayCompleted) {
		if(homeplayCompleted == null) homeplayCompleted = false;
		if(multiSeqId == null) multiSeqId = -1;
		if(localDqid == null) localDqid = -1;
		if(this.isUserLoggingDisabled()) return null;
		var questLog = this.questLogCompleted(localDqid);
		if(questLog == null && !this.isProductionRelease()) throw "Log quest start must be called before logging quest end.";
		var request = questLog.createLogQuestEndRequest(details,callback,parentDqid,multiSeqId,homeplayId,homeplayDetails,homeplayCompleted);
		return new cgs.server.logging.quests.QuestLogContext(request,this._server.getUrlRequestHandler(),localDqid);
	}
	,hasQuestLoggingStarted: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.getQuestLog(localDqid) != null;
	}
	,isDqidValid: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		var questLog = this.getQuestLog(localDqid);
		if(questLog != null) return questLog.isDqidValid(); else return false;
	}
	,getDqidRequestId: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		var questLog = this.getQuestLog(localDqid);
		if(questLog != null) return questLog.getDqidRequestId(); else return -1;
	}
	,getDqid: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		var questLog = this.getQuestLog(localDqid);
		if(questLog != null) return questLog.getDqid(); else return null;
	}
	,addDqidCallback: function(callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		var questLog = this.getQuestLog(localDqid);
		if(questLog != null) questLog.addDqidCallback(callback);
	}
	,logQuestAction: function(action,localDqid,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDqid == null) localDqid = -1;
		if(this.isUserLoggingDisabled()) return;
		var questLog = this.getQuestLog(localDqid);
		if(questLog == null && !this.isProductionRelease()) throw "Log quest start must be called before logging quest actions.";
		questLog.logQuestAction(action,forceFlush);
	}
	,logQuestActionData: function(action,localDqid,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDqid == null) localDqid = -1;
		if(this.isUserLoggingDisabled()) return;
		var questLog = this.getQuestLog(localDqid);
		if(questLog == null && !this.isProductionRelease()) throw "Log quest start must be called before logging quest actions.";
		questLog.logQuestActionData(action,forceFlush);
	}
	,flushActions: function(localDQID,callback) {
		if(localDQID == null) localDQID = -1;
		this.flushActionsOptions(localDQID,callback);
	}
	,flushActionsOptions: function(localDQID,callback) {
		if(localDQID == null) localDQID = -1;
		if(localDQID < 0) this.flushAllActions(callback); else this.flushQuestActionsByID(localDQID,callback);
	}
	,flushAllActions: function(callback) {
		var $it0 = this._questLogMap.iterator();
		while( $it0.hasNext() ) {
			var questLog = $it0.next();
			questLog.flushActions(-1,callback);
		}
	}
	,flushQuestActionsByID: function(localDQID,callback) {
		var questLog = this._questLogMap.get(localDQID);
		if(questLog != null) questLog.flushActions(-1,callback);
	}
	,logQuestScore: function(score,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		var questLog = this.getQuestLog(localDqid);
		if(questLog == null && !this.isProductionRelease()) throw "Log quest start must be called before logging quest score.";
		questLog.logQuestScore(score,callback);
	}
	,logScore: function(score,questID,callback) {
		var serverData = this._server.getCurrentGameServerData();
		var scoreMessage = new cgs.server.logging.messages.ScoreMessage(score,serverData,this.getServerTime());
		scoreMessage.setQuestId(questID);
		scoreMessage.injectParams();
		var callbackRequest = new cgs.server.logging.requests.CallbackRequest(callback,serverData);
		var request = this._server.createUserRequest(cgs.server.CGSServerConstants.SAVE_SCORE,scoreMessage,null,null,1,cgs.server.requests.ServerRequest.GET,callbackRequest,$bind(this,this.handleSaveScoreResponse));
		this.sendLogRequest(request);
	}
	,handleSaveScoreResponse: function(response) {
		var qRequest = response.getPassThroughData();
		var callback = null;
		if(qRequest != null) callback = qRequest.getCallback();
		if(callback != null) callback(response);
	}
	,logHomeplayQuestStart: function(questId,questHash,questDetails,homeplayId,homeplayDetails,localDqid,callback) {
		if(localDqid == null) localDqid = -1;
		return this.localQuestStart(questId,questHash,questDetails,callback,null,localDqid,null,null,-1,-1,-1,-1,-1,homeplayId,homeplayDetails);
	}
	,logHomeplayQuestComplete: function(questDetails,homeplayId,homeplayDetails,homeplayCompleted,localDqid,callback) {
		if(localDqid == null) localDqid = -1;
		if(homeplayCompleted == null) homeplayCompleted = false;
		this.localLogQuestEnd(questDetails,localDqid,callback,null,-1,homeplayId,homeplayDetails,homeplayCompleted);
	}
	,isUidValid: function() {
		return this._initHandler.isUidValid();
	}
	,nextLocalDqid: function() {
		return ++this._localQuestId;
	}
	,currentLocalDqid: function() {
		return this._localQuestId;
	}
	,sendLogRequest: function(request) {
		this._server.sendRequest(request);
	}
	,__class__: cgs.server.logging.UserLoggingHandler
};
cgs.server.logging.actions = {};
cgs.server.logging.actions.IActionBufferHandler = function() { };
cgs.server.logging.actions.IActionBufferHandler.__name__ = true;
cgs.server.logging.actions.IActionBufferHandler.prototype = {
	__class__: cgs.server.logging.actions.IActionBufferHandler
};
cgs.server.logging.actions.DefaultActionBufferHandler = function() {
	this._lastTime = 0;
	this._minTime = 1000;
	this._maxTime = 5000;
	this._rampTime = 10000;
	this._elapsedTime = 0;
};
cgs.server.logging.actions.DefaultActionBufferHandler.__name__ = true;
cgs.server.logging.actions.DefaultActionBufferHandler.__interfaces__ = [cgs.server.logging.actions.IActionBufferHandler];
cgs.server.logging.actions.DefaultActionBufferHandler.prototype = {
	setProperties: function(startBufferTime,endBufferTime,rampTime) {
		this._minTime = startBufferTime;
		this._maxTime = endBufferTime;
		this._rampTime = rampTime;
	}
	,handleTimer: function() {
		if(this._listener != null) this._listener.flushActions();
		if(this._elapsedTime < this._rampTime) {
			this._elapsedTime += this.getElapsedTime();
			if(this._elapsedTime > this._rampTime) this._elapsedTime = this._rampTime;
		}
		this.stop();
		this.start();
	}
	,getElapsedTime: function() {
		return (haxe.Timer.stamp() - this._lastTime) * 1000;
	}
	,getNextFlushTime: function() {
		if(this._rampTime == 0) return this._maxTime;
		if(Math.isNaN(this._elapsedTime)) this._elapsedTime = 0;
		return this._elapsedTime / this._rampTime * (this._maxTime - this._minTime) + this._minTime;
	}
	,setListener: function(value) {
		this._listener = value;
	}
	,start: function() {
		if(Math.isNaN(this._elapsedTime)) this._elapsedTime = 0;
		if(this._timer == null) {
			var nextFlushTime = Std["int"](this.getNextFlushTime());
			this._timer = new haxe.Timer(nextFlushTime);
			this._lastTime = haxe.Timer.stamp();
			this._timer.run = $bind(this,this.handleTimer);
		}
	}
	,stop: function() {
		if(this._timer != null) {
			this._timer.stop();
			this._timer = null;
		}
	}
	,reset: function() {
		this._elapsedTime = 0;
		if(this._timer != null) {
			this._timer.stop();
			this._timer = null;
		}
	}
	,onTick: function(delta) {
	}
	,__class__: cgs.server.logging.actions.DefaultActionBufferHandler
};
cgs.server.logging.actions.IActionBufferListener = function() { };
cgs.server.logging.actions.IActionBufferListener.__name__ = true;
cgs.server.logging.actions.IActionBufferListener.prototype = {
	__class__: cgs.server.logging.actions.IActionBufferListener
};
cgs.server.logging.data = {};
cgs.server.logging.data.ISessionSequenceData = function() { };
cgs.server.logging.data.ISessionSequenceData.__name__ = true;
cgs.server.logging.data.ISessionSequenceData.prototype = {
	__class__: cgs.server.logging.data.ISessionSequenceData
};
cgs.server.logging.data.IQuestActionSequenceData = function() { };
cgs.server.logging.data.IQuestActionSequenceData.__name__ = true;
cgs.server.logging.data.IQuestActionSequenceData.__interfaces__ = [cgs.server.logging.data.ISessionSequenceData];
cgs.server.logging.data.IQuestActionSequenceData.prototype = {
	__class__: cgs.server.logging.data.IQuestActionSequenceData
};
cgs.server.logging.actions.IClientAction = function() { };
cgs.server.logging.actions.IClientAction.__name__ = true;
cgs.server.logging.actions.IClientAction.__interfaces__ = [cgs.server.logging.data.IQuestActionSequenceData];
cgs.server.logging.actions.IClientAction.prototype = {
	__class__: cgs.server.logging.actions.IClientAction
};
cgs.server.logging.actions.QuestAction = $hx_exports.cgs.QuestAction = function(actionID,startTimeStamp,endTimeStamp) {
	if(endTimeStamp == null) endTimeStamp = 0;
	if(startTimeStamp == null) startTimeStamp = 0;
	if(actionID == null) actionID = 0;
	this._sessionSeqId = 0;
	this._sequenceId = 0;
	this._statusID = 0;
	this._endTick = 0;
	this._startTick = 0;
	this._aid = 0;
	this._isBufferable = true;
	this._aid = actionID;
	this._startTick = startTimeStamp;
	this._endTick = endTimeStamp;
	this._actionObject = { };
	this.setActionID(actionID);
	this.setStartTimeStamp(startTimeStamp);
	this.setEndTimeStamp(endTimeStamp);
};
cgs.server.logging.actions.QuestAction.__name__ = true;
cgs.server.logging.actions.QuestAction.__interfaces__ = [cgs.server.logging.actions.IClientAction];
cgs.server.logging.actions.QuestAction.prototype = {
	addProperty: function(key,value) {
		this._actionObject[key] = value;
	}
	,addDetailProperty: function(key,value) {
		if(this._detailObject == null) {
			this._detailObject = { };
			this.addProperty("detail",this._detailObject);
		}
		this._detailObject[key] = value;
	}
	,getDetailObject: function() {
		return this._detailObject;
	}
	,isBufferable: function() {
		return this._isBufferable;
	}
	,setBufferable: function(value) {
		this._isBufferable = value;
	}
	,setDetail: function(value) {
		if(value != null) {
			var _g = 0;
			var _g1 = Reflect.fields(value);
			while(_g < _g1.length) {
				var key = _g1[_g];
				++_g;
				this.addDetailProperty(key,Reflect.field(value,key));
			}
		}
	}
	,setMultiplayerUid: function(uid) {
		this.addProperty(cgs.server.logging.actions.QuestAction.MULTIPLAYER_UID_KEY,uid);
	}
	,setMultiplayerSequenceId: function(id) {
		this.addProperty(cgs.server.logging.actions.QuestAction.MULTIPLAYER_SEQUENCEID_KEY,id);
	}
	,setActionID: function(value) {
		this.addProperty("aid",value);
	}
	,setStartTimeStamp: function(value) {
		this.addProperty("ts",value);
	}
	,setEndTimeStamp: function(value) {
		this.addProperty("te",value);
	}
	,setStatusID: function(value) {
		this.addProperty("stid",value);
	}
	,getActionObject: function() {
		return this._actionObject;
	}
	,getActionId: function() {
		return this._aid;
	}
	,getSequenceId: function() {
		return this._sequenceId;
	}
	,getStartTimestamp: function() {
		return this._startTick;
	}
	,getEndTimestamp: function() {
		return this._endTick;
	}
	,getLogId: function() {
		return this._logid;
	}
	,sessionSequenceId: function() {
		return this._sessionSeqId;
	}
	,questActionSequenceId: function() {
		return this._sequenceId;
	}
	,parseJsonData: function(data) {
		this._aid = data.aid;
		var rawData = data.a_detail;
		if(rawData != null) {
			if(typeof(rawData) == "string") {
				var stringData = rawData;
				if(stringData.charAt(0) == "{" || stringData.charAt(0) == "[") this._detailObject = JSON.parse(stringData); else this._detailObject = stringData;
			} else this._detailObject = data.a_detail;
		}
		this._startTick = data.ts;
		this._endTick = data.te;
		this._logid = data.log_id;
		if(Object.prototype.hasOwnProperty.call(data,"qaction_seqid")) this._sequenceId = data.qaction_seqid;
		if(Object.prototype.hasOwnProperty.call(data,"session_seqid")) this._sessionSeqId = data.session_seqid;
	}
	,__class__: cgs.server.logging.actions.QuestAction
};
cgs.server.logging.actions.QuestActionLogContext = function(action) {
	cgs.server.logging.LogData.call(this);
	this._action = action;
};
cgs.server.logging.actions.QuestActionLogContext.__name__ = true;
cgs.server.logging.actions.QuestActionLogContext.__super__ = cgs.server.logging.LogData;
cgs.server.logging.actions.QuestActionLogContext.prototype = $extend(cgs.server.logging.LogData.prototype,{
	getAction: function() {
		return this._action;
	}
	,setPropertyValue: function(key,value) {
		this._action.addProperty(key,value);
		cgs.server.logging.LogData.prototype.setPropertyValue.call(this,key,value);
	}
	,__class__: cgs.server.logging.actions.QuestActionLogContext
});
cgs.server.logging.actions.UserAction = $hx_exports.cgs.UserAction = function(aid,details) {
	this._actionId = 0;
	this._actionId = aid;
	this._detailObject = details;
};
cgs.server.logging.actions.UserAction.__name__ = true;
cgs.server.logging.actions.UserAction.prototype = {
	getActionId: function() {
		return this._actionId;
	}
	,addDetailProperty: function(key,value) {
		if(this._detailObject == null) this._detailObject = { };
		this._detailObject[key] = value;
	}
	,setDetails: function(value) {
		if(value != null) {
			var _g = 0;
			var _g1 = Reflect.fields(value);
			while(_g < _g1.length) {
				var key = _g1[_g];
				++_g;
				this.addDetailProperty(key,Reflect.field(value,key));
			}
		}
	}
	,getDetails: function() {
		return this._detailObject;
	}
	,__class__: cgs.server.logging.actions.UserAction
};
cgs.server.logging.data.IQuestSequenceData = function() { };
cgs.server.logging.data.IQuestSequenceData.__name__ = true;
cgs.server.logging.data.IQuestSequenceData.__interfaces__ = [cgs.server.logging.data.IQuestActionSequenceData];
cgs.server.logging.data.IQuestSequenceData.prototype = {
	__class__: cgs.server.logging.data.IQuestSequenceData
};
cgs.server.logging.data.QuestData = function() {
};
cgs.server.logging.data.QuestData.__name__ = true;
cgs.server.logging.data.QuestData.prototype = {
	isSessionIdValid: function() {
		if(this._startData != null) return this._startData.isSessionIdValid(); else if(this._endData != null) return this._endData.isSessionIdValid(); else return false;
	}
	,getSessionId: function() {
		if(this._startData != null) return this._startData.getSessionId(); else if(this._endData != null) return this._endData.getSessionId(); else return "";
	}
	,getQuestId: function() {
		if(this._startData != null) return this._startData.getQid(); else if(this._endData != null) return this._endData.getQid(); else return 0;
	}
	,getUid: function() {
		if(this._startData != null) return this._startData.getUid(); else if(this._endData != null) return this._endData.getUid(); else return "";
	}
	,getVersionId: function() {
		if(this._startData != null) return this._startData.getVersionId(); else if(this._endData != null) return this._endData.getVersionId(); else return 0;
	}
	,getCategoryId: function() {
		if(this._startData != null) return this._startData.getCategoryId(); else if(this._endData != null) return this._endData.getCategoryId(); else return 0;
	}
	,getDqid: function() {
		if(this._startData != null) return this._startData.getDqid(); else if(this._endData != null) return this._endData.getDqid(); else return "";
	}
	,getGameId: function() {
		if(this._startData != null) return this._startData.getGameId(); else if(this._endData != null) return this._endData.getGameId(); else return 0;
	}
	,getConditionId: function() {
		if(this._startData != null) return this._startData.getConditionId(); else if(this._endData != null) return this._endData.getConditionId(); else return 0;
	}
	,getStartData: function() {
		return this._startData;
	}
	,getEndData: function() {
		return this._endData;
	}
	,getActions: function() {
		return this._actions;
	}
	,parseQuestData: function(data) {
		if((data instanceof Array) && data.__enum__ == null) {
			var questArray;
			questArray = js.Boot.__cast(data , Array);
			if(questArray.length == 0) return;
			var questData1 = new cgs.server.logging.data.QuestStartEndData();
			questData1.parseJsonData(questArray[0]);
			var questData2 = null;
			if(questArray.length > 1) {
				questData2 = new cgs.server.logging.data.QuestStartEndData();
				questData2.parseJsonData(questArray[1]);
				if(questData2.getStart()) {
					this._startData = questData2;
					this._endData = questData1;
				} else {
					this._startData = questData1;
					this._endData = questData2;
				}
			} else {
				this._startData = questData1;
				this._endData = null;
			}
		}
	}
	,parseActionsData: function(data) {
		var containsSeqId = false;
		this._actions = [];
		if((data instanceof Array) && data.__enum__ == null) {
			var actions;
			actions = js.Boot.__cast(data , Array);
			var currAction;
			var _g = 0;
			while(_g < actions.length) {
				var action = actions[_g];
				++_g;
				currAction = new cgs.server.logging.actions.QuestAction();
				currAction.parseJsonData(action);
				containsSeqId = containsSeqId || currAction.getSequenceId() > 0;
				this._actions.push(currAction);
			}
		}
		var sortFunction;
		if(containsSeqId) sortFunction = $bind(this,this.sortActionsBySeqId); else sortFunction = $bind(this,this.sortActionsByTs);
		this._actions.sort(sortFunction);
	}
	,sortActionsByTs: function(action,action2) {
		var stamp1 = action.getStartTimestamp();
		var stamp2 = action2.getStartTimestamp();
		if(stamp1 < stamp2) return -1; else if(stamp1 > stamp2) return 1;
		return 0;
	}
	,sortActionsBySeqId: function(action,action2) {
		var seq1 = action.getSequenceId();
		var seq2 = action.getSequenceId();
		if(seq1 < seq2) return -1; else if(seq1 > seq2) return 1;
		return 0;
	}
	,__class__: cgs.server.logging.data.QuestData
};
cgs.server.logging.data.QuestStartEndData = function() {
	this._sessionSeqId = 0;
	this._questSeqId = 0;
	this._questActionSeqId = 0;
	this._conditionId = 0;
	this._vid = 0;
	this._gid = 0;
	this._cid = 0;
	this._qid = 0;
};
cgs.server.logging.data.QuestStartEndData.__name__ = true;
cgs.server.logging.data.QuestStartEndData.__interfaces__ = [cgs.server.logging.data.IQuestSequenceData];
cgs.server.logging.data.QuestStartEndData.prototype = {
	isSessionIdValid: function() {
		return this._sessionId != null;
	}
	,getSessionId: function() {
		return this._sessionId;
	}
	,getStart: function() {
		return this._start;
	}
	,getLogTimestamp: function() {
		return this._logTimestamp;
	}
	,getQid: function() {
		return this._qid;
	}
	,getDetails: function() {
		return this._qDetail;
	}
	,getCategoryId: function() {
		return this._cid;
	}
	,getDqid: function() {
		return this._dqid;
	}
	,getGameId: function() {
		return this._gid;
	}
	,getVersionId: function() {
		return this._vid;
	}
	,getUid: function() {
		return this._uid;
	}
	,getConditionId: function() {
		return this._conditionId;
	}
	,sessionSequenceId: function() {
		return this._sessionSeqId;
	}
	,questActionSequenceId: function() {
		return this._questActionSeqId;
	}
	,questSequenceId: function() {
		return this._questSeqId;
	}
	,parseJsonData: function(data) {
		this._qid = data.qid;
		this._logTimestamp = data.log_q_ts;
		var rawData = data.q_detail;
		if(rawData != null) {
			if(typeof(rawData) == "string") {
				var stringData = rawData;
				if(stringData.charAt(0) == "{" || stringData.charAt(0) == "[") this._qDetail = cgs.utils.Json.decode(stringData); else this._qDetail = stringData;
			} else this._qDetail = data.a_detail;
		}
		if(Object.prototype.hasOwnProperty.call(data,"q_s_id")) this._start = data.q_s_id == 1;
		if(Object.prototype.hasOwnProperty.call(data,"cd_id")) this._conditionId = data.cd_id;
		if(Object.prototype.hasOwnProperty.call(data,"sessionid")) this._sessionId = data.sessionid;
		if(Object.prototype.hasOwnProperty.call(data,"quest_seqid")) this._questSeqId = data.quest_seqid;
		if(Object.prototype.hasOwnProperty.call(data,"qaction_seqid")) this._questActionSeqId = data.qaction_seqid;
		if(Object.prototype.hasOwnProperty.call(data,"session_seqid")) this._sessionSeqId = data.session_seqid;
		this._cid = data.cid;
		this._dqid = data.dqid;
		this._gid = data.gid;
		this._uid = data.uid;
		this._vid = data.vid;
	}
	,__class__: cgs.server.logging.data.QuestStartEndData
};
cgs.server.logging.messages = {};
cgs.server.logging.messages.IQuestMessage = function() { };
cgs.server.logging.messages.IQuestMessage.__name__ = true;
cgs.server.logging.messages.IQuestMessage.prototype = {
	__class__: cgs.server.logging.messages.IQuestMessage
};
cgs.server.logging.messages.BaseQuestMessage = function(serverData,time) {
	cgs.server.messages.Message.call(this,serverData,time);
	this._dependencies = new Array();
};
cgs.server.logging.messages.BaseQuestMessage.__name__ = true;
cgs.server.logging.messages.BaseQuestMessage.__interfaces__ = [cgs.server.logging.messages.IQuestMessage];
cgs.server.logging.messages.BaseQuestMessage.__super__ = cgs.server.messages.Message;
cgs.server.logging.messages.BaseQuestMessage.prototype = $extend(cgs.server.messages.Message.prototype,{
	setQuestId: function(value) {
		this._questId = "" + value;
		this.addProperty("qid",this._questId);
	}
	,getQuestId: function() {
		return this._messageObject.qid;
	}
	,setDqid: function(value) {
		this._dqid = value;
		this.addProperty("dqid",this.getDqid());
	}
	,getDqid: function() {
		return this._dqid;
	}
	,isStart: function() {
		return false;
	}
	,addDependency: function(depen) {
		this._dependencies.push(depen);
	}
	,getDependencies: function() {
		return this._dependencies.slice();
	}
	,__class__: cgs.server.logging.messages.BaseQuestMessage
});
cgs.server.logging.messages.BufferedMessage = function(serverData,time) {
	this._seqId = 0;
	this._questID = 0;
	this._localDQID = 0;
	cgs.server.logging.messages.BaseQuestMessage.call(this,serverData,time);
	this._questActions = new Array();
	this._localTimeStamps = new Array();
	this._requireSessionId = true;
};
cgs.server.logging.messages.BufferedMessage.__name__ = true;
cgs.server.logging.messages.BufferedMessage.__interfaces__ = [cgs.server.logging.messages.IQuestMessage];
cgs.server.logging.messages.BufferedMessage.__super__ = cgs.server.logging.messages.BaseQuestMessage;
cgs.server.logging.messages.BufferedMessage.prototype = $extend(cgs.server.logging.messages.BaseQuestMessage.prototype,{
	isStart: function() {
		return false;
	}
	,setSequenceId: function(value) {
		this._seqId = value;
	}
	,getCurrentSequenceId: function() {
		return this._seqId;
	}
	,nextSequenceId: function() {
		return ++this._seqId;
	}
	,isDQIDValid: function() {
		return this.getDqid() != null;
	}
	,setLocalDQID: function(value) {
		this._localDQID = value;
	}
	,getLocalDQID: function() {
		return this._localDQID;
	}
	,updateClientTimeStamp: function() {
		var currAction;
		var currTimeStamp;
		var _g1 = 0;
		var _g = this._questActions.length;
		while(_g1 < _g) {
			var idx = _g1++;
			currAction = this._questActions[idx];
			currTimeStamp = this._localTimeStamps[idx];
			if(currTimeStamp >= 0) currAction.addProperty("client_ts",this._serverTime.getOffsetClientTimeStamp(currTimeStamp));
		}
	}
	,getActionCount: function() {
		return this._questActions.length;
	}
	,addAction: function(action) {
		var seqId = this.nextSequenceId();
		if(this._gameServerData.atLeastVersion2()) {
			action.addProperty("qaction_seqid",seqId);
			this._requiresTimeStamp = true;
			if(this._serverTime != null) {
				if(this._serverTime.isTimeValid()) {
					this._localTimeStamps.push(-1);
					action.addProperty("client_ts",this.getClientTimestamp());
				} else this._localTimeStamps.push(this._serverTime.getClientTimeStamp());
			} else this._localTimeStamps.push(-1);
		}
		if(this._gameServerData.isVersion1()) action.addDetailProperty("qaction_seqid",seqId);
		this._questActions.push(action);
	}
	,addActionData: function(action) {
		this.addAction(action.getAction());
	}
	,getActions: function() {
		var actions = [];
		var _g = 0;
		var _g1 = this._questActions;
		while(_g < _g1.length) {
			var action = _g1[_g];
			++_g;
			actions.push(action.getActionObject());
		}
		return actions;
	}
	,injectParams: function() {
		cgs.server.logging.messages.BaseQuestMessage.prototype.injectParams.call(this);
		this.injectLevelID(true);
		this.injectTypeID(true);
		this.addProperty("actions",this.getActions());
		this.addProperty("dqid",this.getDqid());
		this.addProperty("qid","" + this.getQuestId());
	}
	,__class__: cgs.server.logging.messages.BufferedMessage
});
cgs.server.logging.messages.CreateQuestRequest = function(name,typeID,serverData,serverTime) {
	cgs.server.messages.Message.call(this,serverData,serverTime);
	this.addProperty("q_name",name);
	this.addProperty("q_type_id",typeID);
};
cgs.server.logging.messages.CreateQuestRequest.__name__ = true;
cgs.server.logging.messages.CreateQuestRequest.__super__ = cgs.server.messages.Message;
cgs.server.logging.messages.CreateQuestRequest.prototype = $extend(cgs.server.messages.Message.prototype,{
	__class__: cgs.server.logging.messages.CreateQuestRequest
});
cgs.server.logging.messages.PageloadMessage = function(details,serverData,serverTime) {
	cgs.server.messages.Message.call(this,serverData,serverTime);
	this._plDetails = details;
	this.createDetails();
};
cgs.server.logging.messages.PageloadMessage.__name__ = true;
cgs.server.logging.messages.PageloadMessage.__super__ = cgs.server.messages.Message;
cgs.server.logging.messages.PageloadMessage.prototype = $extend(cgs.server.messages.Message.prototype,{
	createDetails: function() {
		if(this._plDetails == null) this._plDetails = { };
		this._plDetails.os = cgs.utils.Capabilities.getOs();
		this._plDetails.resX = cgs.utils.Capabilities.getScreenResolutionX();
		this._plDetails.resY = cgs.utils.Capabilities.getScreenResolutionY();
		this._plDetails.dpi = cgs.utils.Capabilities.getScreenDpi();
		this._plDetails.flash = cgs.utils.Capabilities.getVersion();
		this._plDetails.cpu = cgs.utils.Capabilities.getCpuArchitecture();
		this._plDetails.pixelAspect = cgs.utils.Capabilities.getPixelAspectRatio();
		this._plDetails.language = cgs.utils.Capabilities.getLanguage();
		var currTime = new Date();
		var domain = this.getServerData().getSwfDomain();
		if(domain != null) {
			if(this._gameServerData.isVersion1()) this._plDetails.domain = domain;
			if(this._gameServerData.atLeastVersion2()) this.addProperty("domain",domain);
		}
		this.addProperty("pl_detail",this._plDetails);
	}
	,__class__: cgs.server.logging.messages.PageloadMessage
});
cgs.server.logging.messages.QuestMessage = function(questID,details,questStart,aeSeqID,dqid,serverData,serverTime) {
	cgs.server.logging.messages.BaseQuestMessage.call(this,serverData,serverTime);
	if(serverTime == null) {
	}
	this.setQuestId(questID);
	this._questDetail = details;
	this.addProperty("q_detail",this._questDetail);
	this._start = questStart;
	this.addProperty("q_s_id",questStart?1:0);
	if(aeSeqID != null) this.addProperty("ae_seq_id",aeSeqID);
	if(dqid != null) this.setDqid(dqid);
	this._requireSessionId = true;
};
cgs.server.logging.messages.QuestMessage.__name__ = true;
cgs.server.logging.messages.QuestMessage.__interfaces__ = [cgs.server.logging.messages.IQuestMessage];
cgs.server.logging.messages.QuestMessage.__super__ = cgs.server.logging.messages.BaseQuestMessage;
cgs.server.logging.messages.QuestMessage.prototype = $extend(cgs.server.logging.messages.BaseQuestMessage.prototype,{
	isStart: function() {
		return this._start;
	}
	,setForeignQuest: function(value) {
		if(value) this.addProperty("q_s_id",2);
	}
	,isDQIDValid: function() {
		return this.getDqid() != null;
	}
	,getQid: function() {
		return this._questId;
	}
	,getQuestDetail: function() {
		return this._questDetail;
	}
	,injectParams: function() {
		cgs.server.logging.messages.BaseQuestMessage.prototype.injectParams.call(this);
		this.injectLevelID(true);
		this.injectTypeID(true);
		this.injectSessionID(false);
		this.injectConditionId();
	}
	,__class__: cgs.server.logging.messages.QuestMessage
});
cgs.server.logging.messages.ScoreMessage = function(score,serverData,serverTime) {
	cgs.server.logging.messages.BaseQuestMessage.call(this,serverData,serverTime);
	this.addProperty("score",score);
};
cgs.server.logging.messages.ScoreMessage.__name__ = true;
cgs.server.logging.messages.ScoreMessage.__interfaces__ = [cgs.server.logging.messages.IQuestMessage];
cgs.server.logging.messages.ScoreMessage.__super__ = cgs.server.logging.messages.BaseQuestMessage;
cgs.server.logging.messages.ScoreMessage.prototype = $extend(cgs.server.logging.messages.BaseQuestMessage.prototype,{
	isStart: function() {
		return false;
	}
	,injectParams: function() {
		cgs.server.logging.messages.BaseQuestMessage.prototype.injectParams.call(this);
		this.injectUserName();
	}
	,__class__: cgs.server.logging.messages.ScoreMessage
});
cgs.server.logging.messages.UserFeedbackMessage = function(age,gender,education,feedback,serverData,serverTime) {
	cgs.server.messages.Message.call(this,serverData,serverTime);
	this.addProperty("age",age);
	this.addProperty("gender",gender);
	this.addProperty("edu",education);
	if(feedback != null) this.addProperty("feedback",feedback);
};
cgs.server.logging.messages.UserFeedbackMessage.__name__ = true;
cgs.server.logging.messages.UserFeedbackMessage.__super__ = cgs.server.messages.Message;
cgs.server.logging.messages.UserFeedbackMessage.prototype = $extend(cgs.server.messages.Message.prototype,{
	__class__: cgs.server.logging.messages.UserFeedbackMessage
});
cgs.server.logging.quests = {};
cgs.server.logging.quests.QuestLogContext = function(request,requestHandler,localDqid) {
	this._localDqid = 0;
	cgs.server.logging.LogData.call(this);
	this._request = request;
	this._requestHandler = requestHandler;
	this._localDqid = localDqid;
};
cgs.server.logging.quests.QuestLogContext.__name__ = true;
cgs.server.logging.quests.QuestLogContext.__super__ = cgs.server.logging.LogData;
cgs.server.logging.quests.QuestLogContext.prototype = $extend(cgs.server.logging.LogData.prototype,{
	setPropertyValue: function(key,value) {
		this._request.setMessageProptery(key,value);
		cgs.server.logging.LogData.prototype.setPropertyValue.call(this,key,value);
	}
	,addReadyHandler: function(handler) {
		this._request.addReadyHandler(handler);
	}
	,addRequestDependencyById: function(requestId,requiresSuccess) {
		if(requiresSuccess == null) requiresSuccess = false;
		this._request.addDependencyById(requestId,requiresSuccess);
	}
	,getLocalDqid: function() {
		return this._localDqid;
	}
	,sendRequest: function() {
		this._requestHandler.sendUrlRequest(this._request);
	}
	,addPropertyDependcy: function(propertyKey) {
		var depen = cgs.server.logging.LogData.prototype.addPropertyDependcy.call(this,propertyKey);
		this._request.addDependency(depen);
		return depen;
	}
	,__class__: cgs.server.logging.quests.QuestLogContext
});
cgs.server.logging.quests.QuestLogger = function(bufferClass,server,logHandler,loggingHandler) {
	this._questId = 0;
	this._dqidRequestId = -1;
	this._actionBufferHandlerClass = bufferClass;
	this._server = server;
	this._requestHandler = logHandler;
	this._loggingHandler = loggingHandler;
	this._dqidCallbacks = new Array();
	this._endedCallbacks = new Array();
};
cgs.server.logging.quests.QuestLogger.__name__ = true;
cgs.server.logging.quests.QuestLogger.__interfaces__ = [cgs.server.logging.actions.IActionBufferListener];
cgs.server.logging.quests.QuestLogger.prototype = {
	hasEnded: function() {
		return this._ended;
	}
	,getStartTimeMs: function() {
		return this._startTimeMs;
	}
	,getEndTimeMs: function() {
		return this._endTimeMs;
	}
	,isLoggingComplete: function() {
		return false;
	}
	,setSequenceIdGenerator: function(value) {
		this._seqIdGenerator = value;
	}
	,nextSessionSequenceId: function() {
		return this._seqIdGenerator.getNextSessionSequenceId();
	}
	,nextQuestSequenceId: function() {
		return this._seqIdGenerator.getNextQuestSequenceId();
	}
	,getServerTime: function() {
		return this._server.getServerTime();
	}
	,getCurrentServerData: function() {
		return this._server.getCurrentGameServerData();
	}
	,logQuestScore: function(score,callback) {
		var serverData = this._server.getCurrentGameServerData();
		var scoreMessage = new cgs.server.logging.messages.ScoreMessage(score,serverData);
		scoreMessage.setQuestId(this.getCurrentQuestID());
		var scoreRequest = new cgs.server.logging.requests.QuestRequest(callback,scoreMessage,$bind(this,this.sendScoreMessage),serverData.getGameId());
		scoreMessage.setDqid(this._dqid);
		this.sendScoreMessage(scoreRequest);
	}
	,sendScoreMessage: function(qRequest) {
		this._server.userRequest(cgs.server.CGSServerConstants.SAVE_SCORE,qRequest.getMessage(),null,null,1,cgs.server.requests.ServerRequest.POST,qRequest,$bind(this,this.handleSaveScoreResponse));
	}
	,handleSaveScoreResponse: function(response) {
		var qRequest = response.getPassThroughData();
		var callback = null;
		if(qRequest != null) callback = qRequest.getCallback();
		if(callback != null) callback(response);
	}
	,startLoggingQuestActions: function(questId,dqid) {
		this._questId = questId;
		this._dqid = dqid;
		this.createQuestMessageBuffer();
	}
	,endLoggingQuestActions: function() {
		this.flushActions();
		this.stopActionBufferHandler();
	}
	,logQuestStart: function(questId,questHash,details,callback,aeSeqId,parentDqid,multiSeqId,linkGameId,linkCategoryId,linkVersionId,linkConditionId) {
		if(linkConditionId == null) linkConditionId = -1;
		if(linkVersionId == null) linkVersionId = -1;
		if(linkCategoryId == null) linkCategoryId = -1;
		if(linkGameId == null) linkGameId = -1;
		if(multiSeqId == null) multiSeqId = -1;
		this.localLogQuestStart(questId,questHash,details,callback,aeSeqId,false,parentDqid,multiSeqId,linkGameId,linkCategoryId,linkVersionId,linkConditionId);
	}
	,logHomeplayQuestStart: function(questId,questHash,questDetails,homeplayId,homeplayDetails,linkGameId,linkCategoryId,linkVersionId,linkConditionId,callback) {
		if(linkConditionId == null) linkConditionId = -1;
		if(linkVersionId == null) linkVersionId = -1;
		if(linkCategoryId == null) linkCategoryId = -1;
		if(linkGameId == null) linkGameId = -1;
		this.localLogQuestStart(questId,questHash,questDetails,callback,null,false,null,-1,linkGameId,linkCategoryId,linkVersionId,linkConditionId,homeplayId,homeplayDetails);
	}
	,logHomeplayQuestComplete: function(questDetails,homeplayId,homeplayDetails,homeplayCompleted,callback) {
		if(homeplayCompleted == null) homeplayCompleted = false;
		this.localLogQuestEnd(questDetails,callback,null,-1,homeplayId,homeplayDetails,homeplayCompleted);
	}
	,logQuestEnd: function(details,callback,parentDqid,multiSeqId) {
		if(multiSeqId == null) multiSeqId = -1;
		this.localLogQuestEnd(details,callback,parentDqid,multiSeqId);
	}
	,localLogQuestEnd: function(details,callback,parentDqid,multiSeqId,homeplayId,homeplayDetails,homeplayCompleted) {
		if(homeplayCompleted == null) homeplayCompleted = false;
		if(multiSeqId == null) multiSeqId = -1;
		var request = this.createLogQuestEndRequest(details,callback,parentDqid,multiSeqId,homeplayId,homeplayDetails,homeplayCompleted);
		this._ended = true;
		this._requestHandler.sendUrlRequest(request);
		var _g = 0;
		var _g1 = this._endedCallbacks;
		while(_g < _g1.length) {
			var callback1 = _g1[_g];
			++_g;
			callback1(this);
		}
		this._endedCallbacks = new Array();
	}
	,createLogQuestEndRequest: function(details,callback,parentDqid,multiSeqId,homeplayId,homeplayDetails,homeplayCompleted) {
		if(homeplayCompleted == null) homeplayCompleted = false;
		if(multiSeqId == null) multiSeqId = -1;
		if(details == null) details = { };
		var serverData = this._server.getCurrentGameServerData();
		var apiMethod;
		if(homeplayId == null) apiMethod = cgs.server.CGSServerConstants.QUEST_END; else apiMethod = cgs.server.CGSServerConstants.HOMEPLAY_QUEST_END;
		var questMessage = new cgs.server.logging.messages.QuestMessage(this._questId,details,false,null,null,serverData,this.getServerTime());
		var message = new cgs.server.logging.requests.QuestRequest(callback,questMessage,$bind(this,this.sendQuestMessage),serverData.getGameId(),apiMethod);
		questMessage.setDqid(this._dqid);
		var actionSeqId = this._currBufferedMessage.nextSequenceId();
		var sessionSeqId = this.nextSessionSequenceId();
		if(serverData.atLeastVersion2()) {
			questMessage.addProperty("qaction_seqid",actionSeqId);
			questMessage.addProperty("session_seqid",sessionSeqId);
			questMessage.injectClientTimeStamp();
			questMessage.addProperty("sessionid",serverData.getSessionId());
		}
		if(serverData.isVersion1()) {
			details.sessionid = sessionSeqId;
			details.qaction_seqid = actionSeqId;
		}
		this._endTimeMs = questMessage.getLocalClientTimestamp();
		if(parentDqid != null) questMessage.addProperty("parent_dqid",parentDqid);
		if(multiSeqId >= 0) questMessage.addProperty("multi_seqid",multiSeqId);
		if(homeplayId != null) {
			questMessage.addProperty("assign_id",homeplayId);
			questMessage.addProperty("assign_complete",homeplayCompleted?1:0);
			if(homeplayDetails != null) questMessage.addProperty("assign_details",homeplayDetails);
		}
		this.flushActions();
		this.stopActionBufferHandler();
		this._ended = true;
		var _g = 0;
		var _g1 = this._endedCallbacks;
		while(_g < _g1.length) {
			var callback1 = _g1[_g];
			++_g;
			callback1(this);
		}
		return this.createQuestRequest(message);
	}
	,localLogQuestStart: function(questId,questHash,details,callback,aeSeqId,legacy,parentDqid,multiSeqId,linkGameId,linkCategoryId,linkVersionId,linkConditionId,homeplayId,homeplayDetails) {
		if(linkConditionId == null) linkConditionId = -1;
		if(linkVersionId == null) linkVersionId = -1;
		if(linkCategoryId == null) linkCategoryId = -1;
		if(linkGameId == null) linkGameId = -1;
		if(multiSeqId == null) multiSeqId = -1;
		if(legacy == null) legacy = false;
		var request = this.createLogQuestStartRequest(questId,questHash,details,callback,aeSeqId,legacy,parentDqid,multiSeqId,linkGameId,linkCategoryId,linkVersionId,linkConditionId,homeplayId,homeplayDetails);
		this._dqidRequestId = this._requestHandler.sendUrlRequest(request);
	}
	,createLogQuestStartRequest: function(questID,questHash,details,callback,aeSeqID,legacy,parentDqid,multiSeqId,linkGameId,linkCategoryId,linkVersionId,linkConditionId,homeplayId,homeplayDetails) {
		if(linkConditionId == null) linkConditionId = -1;
		if(linkVersionId == null) linkVersionId = -1;
		if(linkCategoryId == null) linkCategoryId = -1;
		if(linkGameId == null) linkGameId = -1;
		if(multiSeqId == null) multiSeqId = -1;
		if(legacy == null) legacy = false;
		if(details == null) details = { };
		this._questId = questID;
		var serverData = this._server.getCurrentGameServerData();
		var apiMethod;
		if(homeplayId == null) apiMethod = "quest/start/"; else apiMethod = cgs.server.CGSServerConstants.HOMEPLAY_QUEST_START;
		var questMessage = new cgs.server.logging.messages.QuestMessage(questID,details,true,aeSeqID,null,serverData,this.getServerTime());
		var message = new cgs.server.logging.requests.QuestRequest(callback,questMessage,legacy?$bind(this,this.sendLegacyQuestMessage):$bind(this,this.sendQuestMessage),serverData.getGameId(),apiMethod);
		var sessionSeqId = this.nextSessionSequenceId();
		var questSeqId = this.nextQuestSequenceId();
		if(serverData.atLeastVersion2()) {
			questMessage.addProperty("quest_hash",questHash);
			questMessage.addProperty("sessionid",serverData.getSessionId());
			questMessage.addProperty("session_seqid",sessionSeqId);
			questMessage.addProperty("quest_seqid",questSeqId);
			questMessage.addProperty("qaction_seqid",0);
			questMessage.injectClientTimeStamp();
		}
		if(serverData.isVersion1()) {
			Reflect.setField(details,"sessionid",serverData.getSessionId());
			details.session_seqid = sessionSeqId;
			details.quest_seqid = questSeqId;
			details.qaction_seqid = 0;
		}
		this._startTimeMs = questMessage.getLocalClientTimestamp();
		if(parentDqid != null) questMessage.addProperty("parent_dqid",parentDqid);
		if(multiSeqId >= 0) questMessage.addProperty("multi_seqid",multiSeqId);
		if(homeplayId != null) {
			questMessage.addProperty("assign_id",homeplayId);
			questMessage.addProperty("assign_seqid",0);
			if(homeplayDetails != null) questMessage.addProperty("assign_details",homeplayDetails);
		}
		if(linkGameId > 0) questMessage.addProperty("link_gid",linkGameId);
		if(linkCategoryId > 0) questMessage.addProperty("link_cid",linkCategoryId);
		if(linkVersionId > 0) questMessage.addProperty("link_vid",linkVersionId);
		if(linkConditionId > 0) questMessage.addProperty("link_cdid",linkConditionId);
		this.createQuestMessageBuffer();
		this.startActionBufferHandler();
		return this.createQuestRequest(message);
	}
	,handleDqidLoaded: function(response) {
		var dqidRequest = response.getPassThroughData();
		var callback = dqidRequest.getCallback();
		this._dqid = response.getDqid();
		var dqidFailed = response.getDqidRequestFailed();
		if(dqidFailed || response.failed()) this._dqid = cgs.utils.Guid.create();
		var _g = 0;
		var _g1 = this._dqidCallbacks;
		while(_g < _g1.length) {
			var currCallback = _g1[_g];
			++_g;
			currCallback(this._dqid);
		}
		this._dqidCallbacks = new Array();
		var localID = dqidRequest.localLevelID;
		if(this._currBufferedMessage != null) this._currBufferedMessage.setDqid(this._dqid);
	}
	,isDqidValid: function() {
		return this._dqid != null;
	}
	,getDqidRequestId: function() {
		return this._dqidRequestId;
	}
	,getDqid: function() {
		return this._dqid;
	}
	,getQuestId: function() {
		return this._questId;
	}
	,addDqidCallback: function(callback) {
		if(callback == null) return;
		if(this.isDqidValid()) callback(this._dqid); else this._dqidCallbacks.push(callback);
	}
	,addEndedCallback: function(callback) {
		if(callback == null) return;
		if(this.hasEnded()) callback(this); else this._endedCallbacks.push(callback);
	}
	,sendQuestMessage: function(message) {
		return this._requestHandler.sendUrlRequest(this.createQuestRequest(message));
	}
	,createQuestRequest: function(message) {
		var request = this._server.createServerRequest(message.getApiMethod(),message.getMessage(),null,null,1,message,null,cgs.server.requests.ServerRequest.POST,"text",true,new cgs.server.responses.QuestLogResponseStatus(),$bind(this,this.handleQuestStartResponse));
		if(!message.isStart()) request.addDependencyById(this._dqidRequestId); else if(request.getId() <= 0 && message.isStart()) {
			request.setId(this._requestHandler.nextRequestId());
			this._dqidRequestId = request.getId();
		}
		request.addRequestDependency(this._loggingHandler.getUidRequestDependency());
		request.addRequestDependency(this._loggingHandler.getSessionRequestDependency());
		request.addReadyHandler($bind(this,this.handleQuestRequestReady));
		return request;
	}
	,handleQuestRequestReady: function(request) {
		request.injectParameter("dqid",this._dqid);
		request.injectUid();
		request.injectSessionId(this._server.getCurrentGameServerData().getSessionId());
	}
	,sendLegacyQuestMessage: function(message) {
		var request = this._server.createServerRequest(cgs.server.CGSServerConstants.LEGACY_QUEST_START,message.getMessage(),null,null,1,message,null,cgs.server.requests.ServerRequest.POST,"text",true,new cgs.server.responses.QuestLogResponseStatus(),$bind(this,this.handleQuestStartResponse));
		if(!message.isStart()) request.addDependencyById(this._dqidRequestId);
		request.addRequestDependency(this._loggingHandler.getUidRequestDependency());
		request.addRequestDependency(this._loggingHandler.getSessionRequestDependency());
		this._requestHandler.sendUrlRequest(request);
	}
	,handleQuestStartResponse: function(response) {
		this._dqid = response.getDqid();
		var dqidFailed = response.getDqidRequestFailed();
		if(dqidFailed || response.failed()) this._dqid = cgs.utils.Guid.create();
		var _g = 0;
		var _g1 = this._dqidCallbacks;
		while(_g < _g1.length) {
			var currCallback = _g1[_g];
			++_g;
			currCallback(this._dqid);
		}
		if(this._currBufferedMessage != null) this._currBufferedMessage.setDqid(this._dqid);
		var questRequest = response.getPassThroughData();
		var callback = questRequest.getCallback();
		if(callback != null) callback(response);
	}
	,getLastLocalDQID: function() {
		if(this._currBufferedMessage != null) return this._currBufferedMessage.getLocalDQID(); else return -1;
	}
	,getCurrentQuestID: function() {
		if(this._currBufferedMessage != null) return this._currBufferedMessage.getQuestId(); else return 0;
	}
	,getCurrentDQID: function() {
		if(this._currBufferedMessage != null) return this._currBufferedMessage.getDqid(); else return "";
	}
	,logQuestAction: function(action,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		this.localLogQuestActions(action,null,forceFlush);
	}
	,logQuestActionData: function(action,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		this.localLogQuestActions(action.getAction(),action.getDependencies(),forceFlush);
	}
	,localLogQuestActions: function(action,dependencies,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		var serverData = this._server.getCurrentGameServerData();
		var sessionSeqId = this.nextSessionSequenceId();
		if(serverData.atLeastVersion2()) action.addProperty("session_seqid",sessionSeqId);
		if(serverData.isVersion1()) action.addDetailProperty("session_seqid",sessionSeqId);
		if(!action.isBufferable()) {
			this.flushActions();
			forceFlush = true;
		}
		var bufferMessage = this._currBufferedMessage;
		bufferMessage.addAction(action);
		if(bufferMessage != null && dependencies != null) {
			var _g = 0;
			while(_g < dependencies.length) {
				var depen = dependencies[_g];
				++_g;
				bufferMessage.addDependency(depen);
			}
		}
		if(forceFlush) this.flushActions();
	}
	,createQuestMessageBuffer: function() {
		var prevMessage = this._currBufferedMessage;
		this._currBufferedMessage = new cgs.server.logging.messages.BufferedMessage(this.getCurrentServerData(),this.getServerTime());
		this._currBufferedMessage.setQuestId(this._questId);
		this._currBufferedMessage.setDqid(this._dqid);
		if(prevMessage != null) this._currBufferedMessage.setSequenceId(prevMessage.getCurrentSequenceId());
		return this._currBufferedMessage;
	}
	,pauseActionBufferHandler: function() {
		if(this._actionBufferHandler == null) return;
		this._actionBufferHandler.stop();
	}
	,resumeActionBufferHandler: function() {
		if(this._actionBufferHandler == null) return;
		this._actionBufferHandler.start();
	}
	,startActionBufferHandler: function() {
		if(this._actionBufferHandler == null) {
			this._actionBufferHandler = Type.createEmptyInstance(this._actionBufferHandlerClass);
			this._actionBufferHandler.setListener(this);
			this._actionBufferHandler.setProperties(cgs.server.CGSServerConstants.bufferFlushIntervalStart,cgs.server.CGSServerConstants.bufferFlushIntervalEnd,cgs.server.CGSServerConstants.bufferFlushRampTime);
		}
		this._actionBufferHandler.start();
	}
	,stopActionBufferHandler: function() {
		if(this._actionBufferHandler == null) return;
		this._actionBufferHandler.stop();
	}
	,flushActions: function(localDqid,callback) {
		if(localDqid == null) localDqid = -1;
		var flushBuffer = this._currBufferedMessage;
		if(flushBuffer == null) return;
		if(!flushBuffer.isDQIDValid()) flushBuffer.setDqid(this._dqid);
		if(flushBuffer.getActionCount() == 0) return; else this.createQuestMessageBuffer();
		var serverData = flushBuffer.getServerData();
		var request = new cgs.server.logging.requests.QuestRequest(callback,flushBuffer,$bind(this,this.sendActionsToServer),serverData.getGameId());
		this.sendActionsToServer(request);
	}
	,sendActionsToServer: function(qRequest) {
		var _g = this;
		var request = this._server.createUserRequest(cgs.server.CGSServerConstants.QUEST_ACTIONS,qRequest.getMessage(),null,null,1,cgs.server.requests.ServerRequest.POST,qRequest,$bind(this,this.handleActionResponse));
		request.addDependencyById(this._dqidRequestId);
		request.addRequestDependency(this._loggingHandler.getUidRequestDependency());
		request.addReadyHandler(function(request2) {
			request.injectParameter("dqid",_g._dqid);
			request.injectUid();
		});
		var _g1 = 0;
		var _g11 = qRequest.getDependencies();
		while(_g1 < _g11.length) {
			var depen = _g11[_g1];
			++_g1;
			request.addDependency(depen);
		}
		this._server.sendRequest(request);
	}
	,handleActionResponse: function(response) {
		var qRequest = response.getPassThroughData();
		var message;
		message = js.Boot.__cast(qRequest.getQuestMessage() , cgs.server.logging.messages.BufferedMessage);
		var callback = qRequest.getCallback();
		if(callback != null) callback(response);
	}
	,parseResponseData: function(rawData) {
		var data = null;
		try {
			var urlVars = new cgs.http.UrlVariables(rawData);
			data = cgs.utils.Json.decode(urlVars.getParameter("data"));
		} catch( er ) {
		}
		return data;
	}
	,didRequestFail: function(dataObject) {
		if(dataObject == null) return true;
		var failed = true;
		if(Object.prototype.hasOwnProperty.call(dataObject,"tstatus")) failed = dataObject.tstatus != "t";
		return failed;
	}
	,__class__: cgs.server.logging.quests.QuestLogger
};
cgs.server.logging.quests.QuestStartData = function() { };
cgs.server.logging.quests.QuestStartData.__name__ = true;
cgs.server.logging.quests.QuestStartData.prototype = {
	QuestStartData: function() {
	}
	,__class__: cgs.server.logging.quests.QuestStartData
};
cgs.server.logging.requests = {};
cgs.server.logging.requests.ICallbackRequest = function() { };
cgs.server.logging.requests.ICallbackRequest.__name__ = true;
cgs.server.logging.requests.ICallbackRequest.prototype = {
	__class__: cgs.server.logging.requests.ICallbackRequest
};
cgs.server.logging.requests.CallbackRequest = function(callback,gameServerData,returnType) {
	if(returnType == null) returnType = "TEXT";
	this._callback = callback;
	this._gameServerData = gameServerData;
	this._returnDataType = returnType;
};
cgs.server.logging.requests.CallbackRequest.__name__ = true;
cgs.server.logging.requests.CallbackRequest.__interfaces__ = [cgs.server.logging.requests.ICallbackRequest];
cgs.server.logging.requests.CallbackRequest.prototype = {
	getCallback: function() {
		return this._callback;
	}
	,setCallback: function(value) {
		this._callback = value;
	}
	,setGameServerData: function(value) {
		this._gameServerData = value;
	}
	,getGameServerData: function() {
		return this._gameServerData;
	}
	,getReturnDataType: function() {
		return this._returnDataType;
	}
	,__class__: cgs.server.logging.requests.CallbackRequest
};
cgs.server.logging.requests.DQIDRequest = function(id,callback) {
	this.localLevelID = 0;
	cgs.server.logging.requests.CallbackRequest.call(this,callback,null);
	this.localLevelID = id;
};
cgs.server.logging.requests.DQIDRequest.__name__ = true;
cgs.server.logging.requests.DQIDRequest.__super__ = cgs.server.logging.requests.CallbackRequest;
cgs.server.logging.requests.DQIDRequest.prototype = $extend(cgs.server.logging.requests.CallbackRequest.prototype,{
	__class__: cgs.server.logging.requests.DQIDRequest
});
cgs.server.logging.requests.GameDataRequest = function(callback,dataId,saveId) {
	if(saveId == null) saveId = -1;
	this.saveId = 0;
	cgs.server.logging.requests.CallbackRequest.call(this,callback,null);
	this.dataId = dataId;
	this.saveId = saveId;
};
cgs.server.logging.requests.GameDataRequest.__name__ = true;
cgs.server.logging.requests.GameDataRequest.__super__ = cgs.server.logging.requests.CallbackRequest;
cgs.server.logging.requests.GameDataRequest.prototype = $extend(cgs.server.logging.requests.CallbackRequest.prototype,{
	__class__: cgs.server.logging.requests.GameDataRequest
});
cgs.server.requests = {};
cgs.server.requests.DataRequest = function(completeCallback) {
	this._completeCallback = completeCallback;
};
cgs.server.requests.DataRequest.__name__ = true;
cgs.server.requests.DataRequest.prototype = {
	setCallback: function(value) {
		this._completeCallback = value;
	}
	,makeCompleteCallback: function() {
		if(this._completeCallback != null) this._completeCallback(this);
	}
	,failed: function() {
		return this._failed;
	}
	,isComplete: function() {
		return this._complete;
	}
	,getData: function() {
		return this._rawData;
	}
	,applyData: function() {
	}
	,makeRequests: function(server) {
	}
	,parseResponseData: function(rawData) {
		var data = null;
		try {
			var urlVars = new cgs.http.UrlVariables(rawData);
			data = cgs.utils.Json.decode(urlVars.getParameter("data"));
		} catch( er ) {
			this._parsingFailed = true;
		}
		return data;
	}
	,didRequestFail: function(dataObject) {
		if(dataObject == null) return true;
		var failed = true;
		if(Object.prototype.hasOwnProperty.call(dataObject,"tstatus")) failed = dataObject.tstatus != "t";
		return failed;
	}
	,__class__: cgs.server.requests.DataRequest
};
cgs.server.logging.requests.QuestActionsRequest = function(server,dqid,callback) {
	cgs.server.requests.DataRequest.call(this,callback);
	this._server = server;
	this._dqid = dqid;
};
cgs.server.logging.requests.QuestActionsRequest.__name__ = true;
cgs.server.logging.requests.QuestActionsRequest.__super__ = cgs.server.requests.DataRequest;
cgs.server.logging.requests.QuestActionsRequest.prototype = $extend(cgs.server.requests.DataRequest.prototype,{
	makeRequests: function(handler) {
		var message = this._server.getServerMessage();
		message.injectGameParams();
		message.addProperty("dqid",this._dqid);
		this._server.request(cgs.server.CGSServerConstants.GET_ACTIONS_BY_DQID,$bind(this,this.handleActionsRetrieved),message);
	}
	,handleActionsRetrieved: function(response) {
		this._rawData = response.getData();
		this.makeCompleteCallback();
	}
	,__class__: cgs.server.logging.requests.QuestActionsRequest
});
cgs.server.requests.BatchedDataRequest = function(callback,userCallback) {
	this._currRequestGroup = 0;
	cgs.server.requests.DataRequest.call(this,callback);
	this._requestGroups = [];
	this._currentRequests = [];
	this._userCallback = userCallback;
};
cgs.server.requests.BatchedDataRequest.__name__ = true;
cgs.server.requests.BatchedDataRequest.__super__ = cgs.server.requests.DataRequest;
cgs.server.requests.BatchedDataRequest.prototype = $extend(cgs.server.requests.DataRequest.prototype,{
	getUserCallback: function() {
		return this._userCallback;
	}
	,addRequestGroup: function(requests) {
		var _g = 0;
		while(_g < requests.length) {
			var request = requests[_g];
			++_g;
			request.setCallback($bind(this,this.requestCallback));
		}
		this._requestGroups.push(requests);
	}
	,requestCallback: function(request) {
		var removeIdx = Lambda.indexOf(this._currentRequests,request);
		if(removeIdx >= 0) this._currentRequests.splice(removeIdx,1);
		if(this._currentRequests.length == 0) {
			if(this._currRequestGroup == this._requestGroups.length) this.makeCompleteCallback(); else this.makeRequests(this._requestHandler);
		}
	}
	,makeRequests: function(handler) {
		this._requestHandler = handler;
		if(this._currRequestGroup < this._requestGroups.length) {
			var requests = this._requestGroups[this._currRequestGroup];
			this._currRequestGroup++;
			var _g = 0;
			while(_g < requests.length) {
				var request = requests[_g];
				++_g;
				this._currentRequests.push(request);
				request.makeRequests(this._requestHandler);
			}
		}
	}
	,__class__: cgs.server.requests.BatchedDataRequest
});
cgs.server.logging.requests.QuestDataRequest = function(server,dqid,userCallback) {
	cgs.server.requests.BatchedDataRequest.call(this,null,userCallback);
	this._dqid = dqid;
	this._actionRequest = new cgs.server.logging.requests.QuestActionsRequest(server,this._dqid,null);
	this._startEndRequest = new cgs.server.logging.requests.QuestStartEndRequest(server,this._dqid,null);
	this.addRequestGroup([this._startEndRequest,this._actionRequest]);
};
cgs.server.logging.requests.QuestDataRequest.__name__ = true;
cgs.server.logging.requests.QuestDataRequest.__super__ = cgs.server.requests.BatchedDataRequest;
cgs.server.logging.requests.QuestDataRequest.prototype = $extend(cgs.server.requests.BatchedDataRequest.prototype,{
	makeCompleteCallback: function() {
		this.handleRequestsComplete();
	}
	,handleRequestsComplete: function() {
		var questData = new cgs.server.logging.data.QuestData();
		questData.parseActionsData(this._actionRequest.getData());
		questData.parseQuestData(this._startEndRequest.getData());
		if(this._userCallback != null) this._userCallback(questData,this._failed);
	}
	,__class__: cgs.server.logging.requests.QuestDataRequest
});
cgs.server.logging.requests.QuestRequest = function(callback,questMessage,requestCallback,questGameID,apiMethod) {
	if(apiMethod == null) apiMethod = "quest/start/";
	if(questGameID == null) questGameID = 0;
	this._questGameID = 0;
	cgs.server.logging.requests.CallbackRequest.call(this,callback,null);
	this._questMessage = questMessage;
	this._requestCallback = requestCallback;
	this._questGameID = questGameID;
	this._apiMethod = apiMethod;
};
cgs.server.logging.requests.QuestRequest.__name__ = true;
cgs.server.logging.requests.QuestRequest.__super__ = cgs.server.logging.requests.CallbackRequest;
cgs.server.logging.requests.QuestRequest.prototype = $extend(cgs.server.logging.requests.CallbackRequest.prototype,{
	getDependencies: function() {
		if(this._questMessage != null) return this._questMessage.getDependencies(); else return new Array();
	}
	,getApiMethod: function() {
		return this._apiMethod;
	}
	,isStart: function() {
		if(this._questMessage != null) return this._questMessage.isStart(); else return false;
	}
	,getRequestCallback: function() {
		return this._requestCallback;
	}
	,setDqid: function(value) {
		if(this._questMessage != null) this._questMessage.setDqid(value);
	}
	,getDQID: function() {
		if(this._questMessage != null) return this._questMessage.getDqid(); else return null;
	}
	,getDqid: function() {
		return this.getDQID();
	}
	,getQuestMessage: function() {
		return this._questMessage;
	}
	,getMessage: function() {
		this.addParams();
		return js.Boot.__cast(this._questMessage , cgs.server.messages.Message);
	}
	,getQuestMessageObject: function() {
		this.addParams();
		return this._questMessage.getMessageObject();
	}
	,addParams: function() {
		this._questMessage.injectParams();
		if(this._questGameID > 0) this._questMessage.addProperty("g_s_id",this._questGameID);
	}
	,__class__: cgs.server.logging.requests.QuestRequest
});
cgs.server.logging.requests.QuestStartEndRequest = function(server,dqid,callback) {
	cgs.server.requests.DataRequest.call(this,callback);
	this._server = server;
	this._dqid = dqid;
};
cgs.server.logging.requests.QuestStartEndRequest.__name__ = true;
cgs.server.logging.requests.QuestStartEndRequest.__super__ = cgs.server.requests.DataRequest;
cgs.server.logging.requests.QuestStartEndRequest.prototype = $extend(cgs.server.requests.DataRequest.prototype,{
	makeRequests: function(handler) {
		var message = this._server.getServerMessage();
		message.injectGameParams();
		message.addProperty("dqid",this._dqid);
		this._server.request(cgs.server.CGSServerConstants.GET_QUESTS_BY_DQID,$bind(this,this.handleDataRetrieved),message);
	}
	,handleDataRetrieved: function(response) {
		this._rawData = this.parseResponseData(response.getRawData());
		this.makeCompleteCallback();
	}
	,__class__: cgs.server.logging.requests.QuestStartEndRequest
});
cgs.server.logging.requests.UUIDRequest = function(callback,cacheUUID,gameData) {
	cgs.server.logging.requests.CallbackRequest.call(this,callback,gameData);
	this.cacheUUID = cacheUUID;
};
cgs.server.logging.requests.UUIDRequest.__name__ = true;
cgs.server.logging.requests.UUIDRequest.__super__ = cgs.server.logging.requests.CallbackRequest;
cgs.server.logging.requests.UUIDRequest.prototype = $extend(cgs.server.logging.requests.CallbackRequest.prototype,{
	__class__: cgs.server.logging.requests.UUIDRequest
});
cgs.server.requests.IServerRequest = function() { };
cgs.server.requests.IServerRequest.__name__ = true;
cgs.server.requests.IServerRequest.__interfaces__ = [cgs.http.IUrlRequest];
cgs.server.requests.IServerRequest.prototype = {
	__class__: cgs.server.requests.IServerRequest
};
cgs.server.requests.PageloadRequest = function(server,details,completeCallback) {
	this._requestId = 0;
	cgs.server.requests.DataRequest.call(this,completeCallback);
	this._server = server;
};
cgs.server.requests.PageloadRequest.__name__ = true;
cgs.server.requests.PageloadRequest.__super__ = cgs.server.requests.DataRequest;
cgs.server.requests.PageloadRequest.prototype = $extend(cgs.server.requests.DataRequest.prototype,{
	makeRequests: function(handler) {
		if(this._pageloadDetails == null) this._pageloadDetails = { };
		this._gameServerData = this._server.getCurrentGameServerData();
		var message = new cgs.server.logging.messages.PageloadMessage(this._pageloadDetails,this._gameServerData,this._server.getServerTime());
		if(this._gameServerData.isVersion1()) {
			this._gameServerData.setSessionId(cgs.utils.Guid.create());
			this._pageloadDetails.sessionid = this._gameServerData.getSessionId();
		}
		if(this._gameServerData.atLeastVersion2()) message.injectClientTimeStamp();
		message.injectParams();
		message.injectEventID(true);
		message.injectConditionId();
		this._requestId = this._server.serverRequest(cgs.server.CGSServerConstants.PAGELOAD,message,null,null,1,null,null,cgs.http.UrlRequestMethod.POST,"text",true,null,$bind(this,this.handlePageLoadResponse));
	}
	,getRequestId: function() {
		return this._requestId;
	}
	,handlePageLoadResponse: function(responseStatus) {
		var responseObj = responseStatus.getData();
		var gameData = responseStatus.getGameServerData();
		var generateSessionId = true;
		if(responseStatus.failed()) {
		} else if(responseObj != null) {
			if(Object.prototype.hasOwnProperty.call(responseObj,"r_data")) {
				var returnData = responseObj.r_data;
				if(Object.prototype.hasOwnProperty.call(returnData,"play_count")) gameData.setUserPlayCount(returnData.play_count);
				if(Object.prototype.hasOwnProperty.call(returnData,"sessionid")) {
					gameData.setSessionId(returnData.sessionid);
					generateSessionId = false;
				}
			}
			if(generateSessionId && !gameData.isSessionIDValid()) gameData.setSessionId(cgs.utils.Guid.create());
		}
		if(this._completeCallback != null) this._completeCallback(responseStatus);
	}
	,__class__: cgs.server.requests.PageloadRequest
});
cgs.server.requests.ServerRequest = function(serverMethod,callback,data,params,extraData,requestType,url,serverData) {
	if(requestType == null) requestType = "text";
	this._urlType = 1;
	this._serverFailureCount = 0;
	cgs.http.UrlRequest.call(this,null,null,callback);
	this._gameServerData = serverData;
	if(serverMethod != null) this._serverMethod = serverMethod; else this._serverMethod = "";
	this._data = data;
	this.params = params;
	this._extraData = extraData;
	this._generalURL = url;
};
cgs.server.requests.ServerRequest.__name__ = true;
cgs.server.requests.ServerRequest.__interfaces__ = [cgs.server.requests.IServerRequest];
cgs.server.requests.ServerRequest.getTimeStamp = function() {
	return cgs.utils.Base64.getTimestamp();
};
cgs.server.requests.ServerRequest.__super__ = cgs.http.UrlRequest;
cgs.server.requests.ServerRequest.prototype = $extend(cgs.http.UrlRequest.prototype,{
	addParameter: function(key,value) {
		if(this.params == null) this.params = { };
		this.params[key] = value;
	}
	,setMessageProptery: function(key,value) {
		if(this._message != null) this._message.addProperty(key,value); else if(this._data != null) this._data[key] = value;
	}
	,isFailure: function(response) {
		if(response.getData() == "" || response.getData() == null) return true;
		return false;
	}
	,setGeneralUrl: function(value) {
		this._generalURL = value;
	}
	,setRequestType: function(value) {
		this._method = value;
	}
	,setMessage: function(value) {
		this._message = value;
	}
	,hasData: function() {
		return this._data != null || this._message != null;
	}
	,getData: function() {
		if(this._message != null) return this._message.getMessageObject(); else return this._data;
	}
	,injectUid: function() {
		var data = this.getData();
		if(this._gameServerData != null && data != null) data.uid = this._gameServerData.getUid();
	}
	,injectParameter: function(key,value) {
		var data = this.getData();
		if(data != null) data[key] = value;
	}
	,hasUid: function() {
		var data = this.getData();
		if(data == null) return false;
		return Object.prototype.hasOwnProperty.call(data,"uid");
	}
	,setUidRequired: function(value) {
		this._uidRequired = value;
	}
	,getUidRequired: function() {
		return this._uidRequired;
	}
	,injectClientTimestamp: function(value) {
		if(this._message != null) this._message.updateClientTimeStamp(); else {
			var data = this.getData();
			if(data != null) data.client_ts = value;
		}
	}
	,hasClientTimestamp: function() {
		if(this._message != null) return this._message.hasClientTimeStamp(); else {
			var data = this.getData();
			if(data != null) return Object.prototype.hasOwnProperty.call(data,"client_ts");
		}
		return false;
	}
	,hasSessionId: function() {
		if(this._message != null) return this._message.hasSessionId(); else {
			var data = this.getData();
			if(data != null) return Object.prototype.hasOwnProperty.call(data,"sessionid");
		}
		return false;
	}
	,injectSessionId: function(value) {
		if(value == null) value = "";
		if(this._message != null) this._message.injectSessionId(); else {
			var data = this.getData();
			if(data != null) data.sessionid = value;
		}
	}
	,getApiMethod: function() {
		return this._serverMethod;
	}
	,setUrlType: function(value) {
		this._urlType = value;
		this.updateProxyParams();
	}
	,isPOST: function() {
		return this._method == cgs.server.requests.ServerRequest.POST || this.proxyParams != null;
	}
	,isGET: function() {
		if(this._method == null) return true; else return this._method == cgs.server.requests.ServerRequest.GET;
	}
	,getExtraData: function() {
		return this._extraData;
	}
	,setExtraData: function(value) {
		this._extraData = value;
	}
	,getBaseURL: function() {
		var baseURL = "";
		if(this._urlType == cgs.server.requests.ServerRequest.GENERAL_URL) baseURL = this._generalURL;
		if(this._gameServerData != null) {
			if(this._urlType == 1) baseURL = this._gameServerData.getServerURL(); else if(this._urlType == cgs.server.requests.ServerRequest.AB_TESTING_URL) baseURL = this._gameServerData.getAbTestingURL(); else if(this._urlType == cgs.server.requests.ServerRequest.INTEGRATION_URL) baseURL = this._gameServerData.getIntegrationURL();
		}
		return baseURL + this._serverMethod;
	}
	,getBaseUrl: function() {
		return this.getBaseURL();
	}
	,getProxyUrlVariables: function() {
		var variables = new cgs.http.UrlVariables();
		var $it0 = this.proxyParams.keys();
		while( $it0.hasNext() ) {
			var key = $it0.next();
			variables.setParameter(key,this.proxyParams.get(key));
		}
		return variables;
	}
	,getUrlVariables: function() {
		var variables = new cgs.http.UrlVariables();
		var jsonDataString = "";
		var data = this.getData();
		if(data != null) {
			jsonDataString = cgs.utils.Json.encode(data);
			var includeData = jsonDataString;
			if(this._gameServerData != null) {
				if(this._gameServerData.getDataEncoding() == cgs.server.logging.GameServerData.BASE_64_ENCODING) includeData = cgs.utils.Base64.encode(jsonDataString);
			}
			variables.setParameter("data",includeData);
		}
		if(this._gameServerData != null) {
			if(this._gameServerData.getSkeyHashVersion() == cgs.server.logging.GameServerData.DATA_SKEY_HASH) variables.setParameter("skey",this._gameServerData.createSkeyHash(jsonDataString));
			variables.setParameter("de",this._gameServerData.getDataEncoding());
			variables.setParameter("dl",this._gameServerData.getDataLevel());
			if(this._gameServerData.getUseDevelopmentServer()) variables.setParameter("latency",cgs.server.CGSServerConstants.serverLatency);
			variables.setParameter("gid",this._gameServerData.getGameId());
			variables.setParameter("cid",this._gameServerData.getCid());
			variables.setParameter("priority",this._gameServerData.getLogPriority());
		}
		if(this.params != null) {
			var _g = 0;
			var _g1 = Reflect.fields(this.params);
			while(_g < _g1.length) {
				var param = _g1[_g];
				++_g;
				variables.setParameter(param,Reflect.field(this.params,param));
			}
		}
		variables.setParameter("noCache",cgs.server.requests.ServerRequest.getTimeStamp());
		return variables;
	}
	,getUrl: function() {
		this.updateProxyParams();
		var requestURL = this.getBaseURL();
		var hasParam = false;
		if(this._gameServerData.useProxy()) requestURL = this._gameServerData.getProxyUrl();
		if(this.proxyParams != null) {
			var proxyVars = this.getProxyUrlVariables();
			requestURL += "?" + proxyVars.toString();
		}
		if(this.isPOST() || this.proxyParams != null) return requestURL;
		var vars = this.getUrlVariables();
		return requestURL + "?" + vars.toString();
	}
	,getResponseStatus: function() {
		if(this._responseStatus == null) this._responseStatus = new cgs.server.responses.CgsResponseStatus();
		if(js.Boot.__instanceof(this._responseStatus,cgs.server.responses.CgsResponseStatus)) {
			var response;
			response = js.Boot.__cast(this._responseStatus , cgs.server.responses.CgsResponseStatus);
			response.setGameServerData(this._gameServerData);
			response.setPassThroughData(this._extraData);
		}
		return cgs.http.UrlRequest.prototype.getResponseStatus.call(this);
	}
	,setGameServerData: function(value) {
		this._gameServerData = value;
	}
	,getGameServerData: function() {
		return this._gameServerData;
	}
	,updateProxyParams: function() {
		if(this._gameServerData == null) return;
		if(this._gameServerData.useProxy()) {
			if(this._urlType == 1) this.addProxyParams(this._gameServerData.getServerURL() + this.getApiMethod()); else if(this._urlType == cgs.server.requests.ServerRequest.AB_TESTING_URL) this.addProxyParams(this._gameServerData.getAbTestingURL() + this.getApiMethod()); else if(this._urlType == cgs.server.requests.ServerRequest.INTEGRATION_URL) this.addProxyParams(this._gameServerData.getIntegrationURL() + this.getApiMethod()); else this.addProxyParams(this.getBaseURL());
		}
	}
	,addProxyParams: function(url) {
		if(this.proxyParams == null) this.proxyParams = new haxe.ds.StringMap();
		var parser = new cgs.utils.UrlParser(url);
		var host = parser.host;
		if(parser.port != null) host += ":" + parser.port;
		this.proxyParams.set("r_url_s",host);
		this.proxyParams.set("r_url_p",parser.path);
		var value;
		if(this.isGET()) value = "GET"; else value = "POST";
		this.proxyParams.set("r_url_action_type",value);
	}
	,setServerFailureCount: function(count) {
		this._serverFailureCount = count;
	}
	,shouldServerFail: function() {
		return this.getFailureCount() < this._serverFailureCount && this._serverFailureCount > 0;
	}
	,writeObjectData: function(data) {
		cgs.http.UrlRequest.prototype.writeObjectData.call(this,data);
		data.url_type = this._urlType;
		data.api_method = this._serverMethod;
		if(this._generalURL != null) data.general_url = this._generalURL;
		data.server_request_data = this._data;
		data.server_request_params = this.params;
		data.uid_required = this._uidRequired;
		data.server_failure_count = this._serverFailureCount;
		data.url_type = this._urlType;
	}
	,parseDataObject: function(data) {
		cgs.http.UrlRequest.prototype.parseDataObject.call(this,data);
	}
	,__class__: cgs.server.requests.ServerRequest
});
cgs.server.requests.ServiceRequest = function(method,message,gameData,callback) {
	cgs.server.requests.ServerRequest.call(this,method,callback,null);
	this.setMessage(message);
	this.setGameServerData(gameData);
	this._urlType = cgs.server.requests.ServerRequest.GENERAL_URL;
	this._responseStatus = new cgs.server.responses.CgsResponseStatus(gameData);
};
cgs.server.requests.ServiceRequest.__name__ = true;
cgs.server.requests.ServiceRequest.__super__ = cgs.server.requests.ServerRequest;
cgs.server.requests.ServiceRequest.prototype = $extend(cgs.server.requests.ServerRequest.prototype,{
	setBaseUrl: function(url) {
		this._generalURL = url;
	}
	,__class__: cgs.server.requests.ServiceRequest
});
cgs.server.responses = {};
cgs.server.responses.IServerResponse = function() { };
cgs.server.responses.IServerResponse.__name__ = true;
cgs.server.responses.IServerResponse.prototype = {
	__class__: cgs.server.responses.IServerResponse
};
cgs.server.requests.UserGameDataRequest = function() {
};
cgs.server.requests.UserGameDataRequest.__name__ = true;
cgs.server.requests.UserGameDataRequest.__interfaces__ = [cgs.server.responses.IServerResponse];
cgs.server.requests.UserGameDataRequest.prototype = {
	getUserGameData: function() {
		return this._gameData;
	}
	,setData: function(value) {
		this._gameData = new cgs.server.appdata.UserGameData();
		this._gameData.parseUserGameData(value);
	}
	,__class__: cgs.server.requests.UserGameDataRequest
};
cgs.server.responses.CgsResponseStatus = function(serverData) {
	this._currentResponseVersion = 0;
	this._tLoad = 0;
	cgs.http.responses.ResponseStatus.call(this);
	this._gameServerData = serverData;
};
cgs.server.responses.CgsResponseStatus.__name__ = true;
cgs.server.responses.CgsResponseStatus.__super__ = cgs.http.responses.ResponseStatus;
cgs.server.responses.CgsResponseStatus.prototype = $extend(cgs.http.responses.ResponseStatus.prototype,{
	localResponse: function() {
		this._localResponse = true;
	}
	,handleResponse: function() {
		cgs.http.responses.ResponseStatus.prototype.handleResponse.call(this);
		this._data = this.parseResponseData(this.getRawData());
		this._success = !this.didRequestFail(this._data);
	}
	,setPassThroughData: function(value) {
		this._passThroughData = value;
	}
	,getPassThroughData: function() {
		return this._passThroughData;
	}
	,setGameServerData: function(value) {
		this._gameServerData = value;
	}
	,getGameServerData: function() {
		return this._gameServerData;
	}
	,hasServerMessage: function() {
		return this._serverMessage != null;
	}
	,getServerMessage: function() {
		return this._serverMessage;
	}
	,getData: function() {
		return this._data;
	}
	,success: function() {
		if(this._localResponse) return this._success;
		return this._success && cgs.http.responses.ResponseStatus.prototype.success.call(this);
	}
	,userRegistrationError: function() {
		if(this.hasServerMessage()) return this._serverMessage == cgs.server.responses.CgsResponseStatus.USER_REGISTRATION_ERROR_MESSAGE || this._serverMessage == cgs.server.responses.CgsResponseStatus.STUDENT_SIGNUP_LOCKED; else return false;
	}
	,userAuthenticationError: function() {
		if(this.hasServerMessage()) return this._serverMessage == cgs.server.responses.CgsResponseStatus.USER_AUTHENTICATION_ERROR_MESSAGE || this._serverMessage == cgs.server.responses.CgsResponseStatus.STUDENT_SIGNUP_LOCKED; else return false;
	}
	,isStudentSignupLocked: function() {
		if(this.hasServerMessage()) return this._serverMessage == cgs.server.responses.CgsResponseStatus.STUDENT_SIGNUP_LOCKED; else return false;
	}
	,parseResponseData: function(rawData,returnDataType) {
		if(returnDataType == null) returnDataType = "JSON";
		var data = null;
		try {
			var dataString = "";
			var serverDataString = null;
			var serverDataIdx = rawData.indexOf(cgs.server.responses.CgsResponseStatus.SERVER_RESPONSE_DATA_PREFIX);
			var dataIdx = rawData.indexOf(cgs.server.responses.CgsResponseStatus.SERVER_RESPONSE_PREFIX);
			if(serverDataIdx > 0 && dataIdx == 0) dataString = rawData.substring(cgs.server.responses.CgsResponseStatus.SERVER_RESPONSE_PREFIX.length,serverDataIdx); else if(dataIdx == 0) dataString = HxOverrides.substr(rawData,cgs.server.responses.CgsResponseStatus.SERVER_RESPONSE_PREFIX.length,null); else if(dataIdx < 0) dataString = rawData; else {
				var urlVars = new cgs.http.UrlVariables(rawData);
				dataString = urlVars.getParameter("data");
				if(urlVars.containsParameter("server_data")) serverDataString = urlVars.getParameter("server_data");
			}
			if(returnDataType == "JSON") {
				data = cgs.utils.Json.decode(dataString);
				this.updateLoggingLoad(data);
				if(Object.prototype.hasOwnProperty.call(data,"message")) this._serverMessage = data.message;
			} else data = dataString;
			if(serverDataString != null) {
				var serverData = cgs.utils.Json.decode(serverDataString);
				this.updateLoggingLoad(serverData);
				if(Object.prototype.hasOwnProperty.call(serverData,"pvid")) this._currentResponseVersion = serverData.pvid; else this._currentResponseVersion = 0;
			} else this._currentResponseVersion = 0;
		} catch( er ) {
			this._dataError = er;
		}
		return data;
	}
	,getDataError: function() {
		return this._dataError;
	}
	,didRequestFail: function(dataObject) {
		if(dataObject == null) return true;
		var failed = false;
		if(Object.prototype.hasOwnProperty.call(dataObject,"tstatus")) failed = dataObject.tstatus != "t";
		if(failed) console.log("Cgs Request failed id: " + this._request.getId());
		return failed;
	}
	,updateLoggingLoad: function(jsonObj) {
		if(jsonObj == null) return;
		if(Object.prototype.hasOwnProperty.call(jsonObj,"tload")) this._tLoad = jsonObj.tload;
	}
	,__class__: cgs.server.responses.CgsResponseStatus
});
cgs.server.responses.CgsUserResponse = function(cgsUser,serverData,userPreInitialized) {
	if(userPreInitialized == null) userPreInitialized = false;
	cgs.server.responses.CgsResponseStatus.call(this,serverData);
	this._cgsUser = cgsUser;
	this._cgsUserPreInitialized = userPreInitialized;
};
cgs.server.responses.CgsUserResponse.__name__ = true;
cgs.server.responses.CgsUserResponse.__super__ = cgs.server.responses.CgsResponseStatus;
cgs.server.responses.CgsUserResponse.prototype = $extend(cgs.server.responses.CgsResponseStatus.prototype,{
	success: function() {
		var requestSuccess = false;
		if(this._cgsUserPreInitialized) requestSuccess = true; else {
			if(this._userResponse != null) requestSuccess = this._userResponse.success(); else if(this._userAuthResponse != null) requestSuccess = this._userAuthResponse.success();
			if(this._dataLoadResponse != null) requestSuccess = requestSuccess && this._dataLoadResponse.success();
			if(this._abTestingResponse != null) requestSuccess = requestSuccess && this._abTestingResponse.success();
		}
		return requestSuccess;
	}
	,setRegistrationResponse: function(response) {
		this._registrationResponse = response;
	}
	,setPageloadResponse: function(response) {
		this._pageloadResponse = response;
	}
	,getPageloadSuccess: function() {
		if(this._pageloadResponse != null) return this._pageloadResponse.success(); else return false;
	}
	,setDataLoadResponse: function(response) {
		this._dataLoadResponse = response;
	}
	,getDataLoadSuccess: function() {
		if(this._dataLoadResponse != null) return this._dataLoadResponse.success(); else return false;
	}
	,setAbTestingResponse: function(response) {
		this._abTestingResponse = response;
	}
	,setAuthorizationResponse: function(response) {
		this._userAuthResponse = response;
	}
	,setUidResponse: function(response) {
		this._userResponse = response;
	}
	,setHomeplaysResponse: function(response) {
		this._homeplays = response;
	}
	,getHomeplaysResponse: function() {
		return this._homeplays;
	}
	,getCgsUser: function() {
		return this._cgsUser;
	}
	,userRegistrationError: function() {
		if(this._registrationResponse != null) return this._registrationResponse.userRegistrationError();
		if(this._userAuthResponse != null) return this._userAuthResponse.userRegistrationError(); else return false;
	}
	,userAuthenticationError: function() {
		if(this._userAuthResponse != null) return this._userAuthResponse.userAuthenticationError(); else return false;
	}
	,isStudentSignupLocked: function() {
		if(this._userAuthResponse != null) return this._userAuthResponse.isStudentSignupLocked(); else return false;
	}
	,__class__: cgs.server.responses.CgsUserResponse
});
cgs.server.responses.DqidResponseStatus = function(serverData) {
	cgs.server.responses.CgsResponseStatus.call(this,serverData);
};
cgs.server.responses.DqidResponseStatus.__name__ = true;
cgs.server.responses.DqidResponseStatus.__super__ = cgs.server.responses.CgsResponseStatus;
cgs.server.responses.DqidResponseStatus.prototype = $extend(cgs.server.responses.CgsResponseStatus.prototype,{
	getDqidRequestFailed: function() {
		return this._dqidFailed || this.failed();
	}
	,getDqid: function() {
		return this._dqid;
	}
	,handleResponse: function() {
		cgs.server.responses.CgsResponseStatus.prototype.handleResponse.call(this);
		var data = this.getData();
		if(this.getLocalError() == null) {
			if(Object.prototype.hasOwnProperty.call(data,"dqid")) {
				this._dqid = data.dqid;
				this._success = true;
			} else {
				this._success = false;
				this._dqidFailed = true;
			}
		}
	}
	,__class__: cgs.server.responses.DqidResponseStatus
});
cgs.server.responses.GameUserDataResponseStatus = function(allData,serverData) {
	cgs.server.responses.CgsResponseStatus.call(this,serverData);
	this._allData = allData;
};
cgs.server.responses.GameUserDataResponseStatus.__name__ = true;
cgs.server.responses.GameUserDataResponseStatus.__super__ = cgs.server.responses.CgsResponseStatus;
cgs.server.responses.GameUserDataResponseStatus.prototype = $extend(cgs.server.responses.CgsResponseStatus.prototype,{
	getUserGameData: function() {
		return this._userGameData;
	}
	,getUserGameDataChunk: function() {
		return this._userDataChunk;
	}
	,handleResponse: function() {
		cgs.server.responses.CgsResponseStatus.prototype.handleResponse.call(this);
		if(this._allData) {
			var response = new cgs.server.requests.UserGameDataRequest();
			response.setData(this.getData());
			this._userGameData = response.getUserGameData();
			this._success = true;
		} else {
			var chunkResponse = new cgs.server.responses.UserDataChunkResponse();
			chunkResponse.setData(this.getData());
			this._userDataChunk = chunkResponse.getDataChunk();
			this._success = true;
		}
	}
	,__class__: cgs.server.responses.GameUserDataResponseStatus
});
cgs.server.responses.HomeplayResponse = function() {
	cgs.server.responses.CgsResponseStatus.call(this);
};
cgs.server.responses.HomeplayResponse.__name__ = true;
cgs.server.responses.HomeplayResponse.__super__ = cgs.server.responses.CgsResponseStatus;
cgs.server.responses.HomeplayResponse.prototype = $extend(cgs.server.responses.CgsResponseStatus.prototype,{
	getHomeplays: function() {
		return this._homesplays;
	}
	,handleResponse: function() {
		cgs.server.responses.CgsResponseStatus.prototype.handleResponse.call(this);
		if(this.success()) {
			this._homesplays = new cgs.homeplays.data.UserHomeplaysData();
			var tempAssignment;
			var tempUserAssignment;
			var assignments = this._data.r_data;
			var components;
			var results;
			var _g = 0;
			while(_g < assignments.length) {
				var assignment = assignments[_g];
				++_g;
				tempAssignment = new cgs.homeplays.data.HomeplayData();
				tempAssignment.setId(assignment.assignment_instance_id);
				tempAssignment.setName(assignment.name);
				components = assignment.components;
				var _g1 = 0;
				try {
					while(_g1 < components.length) {
						var component = components[_g1];
						++_g1;
						var _g2 = component.type;
						switch(_g2) {
						case 1:
							tempAssignment.addQuestId(component.component_id);
							throw "__break__";
							break;
						case 2:
							tempAssignment.addConceptKey(component.component_id);
							throw "__break__";
							break;
						case 4:
							tempAssignment.setLevelCount(component.component_id);
							throw "__break__";
							break;
						}
					}
				} catch( e ) { if( e != "__break__" ) throw e; }
				tempUserAssignment = new cgs.homeplays.data.UserAssignment();
				tempUserAssignment.setHomeplayData(tempAssignment);
				tempUserAssignment.setReplayAllowed(assignment.allow_replay == 1);
				tempUserAssignment.setName(tempAssignment.getName());
				tempUserAssignment.setStartDate(assignment.start_date);
				tempUserAssignment.setDueDate(assignment.due_date);
				results = assignment.results;
				var _g11 = 0;
				while(_g11 < results.length) {
					var result = results[_g11];
					++_g11;
					tempUserAssignment.questCompleted(result.dynamic_quest_id);
				}
				this._homesplays.addAssignment(tempUserAssignment);
			}
		}
	}
	,__class__: cgs.server.responses.HomeplayResponse
});
cgs.server.responses.QuestLogResponseStatus = function(serverData) {
	cgs.server.responses.CgsResponseStatus.call(this,serverData);
};
cgs.server.responses.QuestLogResponseStatus.__name__ = true;
cgs.server.responses.QuestLogResponseStatus.__super__ = cgs.server.responses.CgsResponseStatus;
cgs.server.responses.QuestLogResponseStatus.prototype = $extend(cgs.server.responses.CgsResponseStatus.prototype,{
	getDqidRequestFailed: function() {
		return this._dqidFailed || this.failed();
	}
	,handleResponse: function() {
		cgs.server.responses.CgsResponseStatus.prototype.handleResponse.call(this);
		var data = this.getData();
		if(data == null) {
			this._dqidFailed = true;
			return;
		}
		if(this.getLocalError() == null) {
			if(Object.prototype.hasOwnProperty.call(data,"dqid")) this._dqid = data.dqid; else this._dqidFailed = true;
		}
	}
	,getDqid: function() {
		return this._dqid;
	}
	,__class__: cgs.server.responses.QuestLogResponseStatus
});
cgs.server.responses.ServerTimeResponseStatus = function() {
	cgs.http.responses.ResponseStatus.call(this);
};
cgs.server.responses.ServerTimeResponseStatus.__name__ = true;
cgs.server.responses.ServerTimeResponseStatus.__super__ = cgs.http.responses.ResponseStatus;
cgs.server.responses.ServerTimeResponseStatus.prototype = $extend(cgs.http.responses.ResponseStatus.prototype,{
	success: function() {
		return this._success && cgs.http.responses.ResponseStatus.prototype.success.call(this);
	}
	,handleResponse: function() {
		cgs.http.responses.ResponseStatus.prototype.handleResponse.call(this);
		this._time = this.parseResponseData(this.getRawData());
	}
	,parseResponseData: function(rawData) {
		var failed = false;
		var returnTime = 0;
		try {
			var timeSeconds = Std.parseFloat(rawData);
			var timeMilli = timeSeconds * 1000;
			returnTime = Math.round(timeMilli);
			if(Math.isNaN(returnTime)) returnTime = 0;
		} catch( er ) {
			this._success = false;
		}
		return returnTime;
	}
	,getTime: function() {
		return this._time;
	}
	,__class__: cgs.server.responses.ServerTimeResponseStatus
});
cgs.server.responses.TosResponseStatus = function(tosData,tosKey,serverData) {
	cgs.server.responses.CgsResponseStatus.call(this,serverData);
	this._tosData = tosData;
	this._tosKey = tosKey;
	this._tosItemData = new Array();
};
cgs.server.responses.TosResponseStatus.__name__ = true;
cgs.server.responses.TosResponseStatus.__super__ = cgs.server.responses.CgsResponseStatus;
cgs.server.responses.TosResponseStatus.prototype = $extend(cgs.server.responses.CgsResponseStatus.prototype,{
	handleResponse: function() {
		cgs.server.responses.CgsResponseStatus.prototype.handleResponse.call(this);
		var userTos = null;
		if(Object.prototype.hasOwnProperty.call(this._data,"r_data")) {
			var tosData = this._data.r_data;
			var tosItem;
			var _g = 0;
			while(_g < tosData.length) {
				var tosDataObj = tosData[_g];
				++_g;
				tosItem = new cgs.server.data.TosItemData();
				tosItem.parseObjectData(tosDataObj);
				if(tosItem.getKey() == this._tosKey) userTos = tosItem;
				this._tosItemData.push(tosItem);
			}
		}
		this._tosStatus = new cgs.server.data.UserTosStatus(this._tosData,userTos);
		this._gameServerData.setUserTosStatus(this._tosStatus);
	}
	,containsTosData: function() {
		return this._tosItemData.length > 0;
	}
	,getTosItemData: function() {
		return this._tosItemData;
	}
	,__class__: cgs.server.responses.TosResponseStatus
});
cgs.server.responses.UidResponseStatus = function(serverData) {
	cgs.server.responses.CgsResponseStatus.call(this,serverData);
};
cgs.server.responses.UidResponseStatus.__name__ = true;
cgs.server.responses.UidResponseStatus.__super__ = cgs.server.responses.CgsResponseStatus;
cgs.server.responses.UidResponseStatus.prototype = $extend(cgs.server.responses.CgsResponseStatus.prototype,{
	setUid: function(value) {
		if(value != null) {
			this._success = true;
			this._uid = value;
		}
	}
	,getUid: function() {
		return this._uid;
	}
	,setCacheUid: function(value) {
		this.localResponse();
		this._uid = value;
		this._success = true;
	}
	,handleResponse: function() {
		cgs.server.responses.CgsResponseStatus.prototype.handleResponse.call(this);
		if(this.getLocalError() == null) {
			var data = this.getData();
			if(data != null && Object.prototype.hasOwnProperty.call(data,"uid")) {
				console.log("Uid request success");
				this._uid = this.getData().uid;
				this._success = true;
			} else {
				console.log("Uid request failed");
				this._success = false;
				this._uidFailed = true;
			}
		} else console.log("Uid local error: " + Std.string(this.getLocalError()));
	}
	,__class__: cgs.server.responses.UidResponseStatus
});
cgs.server.responses.UserDataChunkResponse = function() {
};
cgs.server.responses.UserDataChunkResponse.__name__ = true;
cgs.server.responses.UserDataChunkResponse.__interfaces__ = [cgs.server.responses.IServerResponse];
cgs.server.responses.UserDataChunkResponse.prototype = {
	getDataChunk: function() {
		return this._dataChunk;
	}
	,setData: function(value) {
		var dataArray = value;
		if(dataArray.length == 0) return;
		var dataObj = dataArray[0];
		var rawData = dataObj.data_detail;
		var dataDetail = null;
		if(typeof(rawData) == "string") {
			var stringData = rawData;
			if(stringData.toLowerCase() == "null") dataDetail = null; else if(cgs.server.responses.UserDataChunkResponse.SupportLegacyData) {
				if(stringData.length == 0) dataDetail = stringData; else if(stringData.charAt(0) == "{" || stringData.charAt(0) == "[") dataDetail = cgs.utils.Json.decode(rawData); else dataDetail = stringData;
			} else dataDetail = stringData;
		} else dataDetail = rawData;
		this._dataChunk = new cgs.server.appdata.UserDataChunk(dataObj.u_data_id,dataDetail);
	}
	,__class__: cgs.server.responses.UserDataChunkResponse
};
cgs.user = {};
cgs.user.ICgsCacheServerApi = function() { };
cgs.user.ICgsCacheServerApi.__name__ = true;
cgs.user.ICgsCacheServerApi.prototype = {
	__class__: cgs.user.ICgsCacheServerApi
};
cgs.server.services.ICgsServerApi = function() { };
cgs.server.services.ICgsServerApi.__name__ = true;
cgs.server.services.ICgsServerApi.__interfaces__ = [cgs.user.ICgsCacheServerApi,cgs.server.abtesting.IAbTestingServerApi];
cgs.server.services.ICgsServerApi.prototype = {
	__class__: cgs.server.services.ICgsServerApi
};
cgs.server.services.CgsServerApi = function(requestHandler,ntpTime,cgsApi,cacheFactory) {
	this._currentResponseVersion = 0;
	this._serverLoggingPriority = 1;
	this._userAcceptedTOS = false;
	this._requireTermsService = false;
	this._loggingDisabled = false;
	this._questGameID = -1;
	this._localQuestID = 0;
	this._urlRequestHandler = requestHandler;
	this._cgsApi = cgsApi;
	this._cacheFactory = cacheFactory;
	if(this._cacheFactory == null) console.log("Cache factory is null");
	this.setNtpTime(ntpTime);
	this.initDefaultProps();
};
cgs.server.services.CgsServerApi.__name__ = true;
cgs.server.services.CgsServerApi.__interfaces__ = [cgs.server.services.ICgsServerApi,cgs.server.abtesting.IABTestingServer];
cgs.server.services.CgsServerApi.getTimeStamp = function() {
	return cgs.utils.Base64.getTimestamp();
};
cgs.server.services.CgsServerApi.prototype = {
	isProductionRelease: function() {
		if(this._cgsApi != null) return this._cgsApi.isProductionRelease(); else return false;
	}
	,getUrlRequestHandler: function() {
		return this._urlRequestHandler;
	}
	,getSessionRequestDependency: function() {
		var logHandler = this._gameServerData.getUserLoggingHandler();
		return logHandler.getSessionRequestDependency();
	}
	,getUidRequestDependency: function() {
		var logHandler = this._gameServerData.getUserLoggingHandler();
		return logHandler.getUidRequestDependency();
	}
	,initDefaultProps: function() {
		this._actionBufferHandlerClass = cgs.server.logging.actions.DefaultActionBufferHandler;
		this.setupLogPriorites();
		this._userDataManager = new cgs.server.data.UserDataManager();
		this._tosData = new cgs.server.data.TosData();
		this._localQuestID = 0;
	}
	,getUserAuthData: function() {
		return this._userAuth;
	}
	,getUserLoggedIn: function() {
		return this._userAuth != null;
	}
	,getUserDataManager: function() {
		return this._userDataManager;
	}
	,setupLogPriorites: function() {
		if(this._priorityMap == null) this._priorityMap = new haxe.ds.StringMap();
		var v = cgs.server.services.CgsServerApi.LOG_PRIORITY_ACTIONS;
		this._priorityMap.set(cgs.server.CGSServerConstants.ACTION_NO_QUEST,v);
		v;
		var v1 = cgs.server.services.CgsServerApi.LOG_NO_ACTIONS;
		this._priorityMap.set(cgs.server.CGSServerConstants.DQID_REQUEST,v1);
		v1;
		var v2 = cgs.server.services.CgsServerApi.LOG_NO_ACTIONS;
		this._priorityMap.set(cgs.server.CGSServerConstants.LEGACY_QUEST_START,v2);
		v2;
		var v3 = cgs.server.services.CgsServerApi.LOG_NO_DATA;
		this._priorityMap.set(cgs.server.CGSServerConstants.LOAD_GAME_DATA,v3);
		v3;
		var v4 = cgs.server.services.CgsServerApi.LOG_NO_DATA;
		this._priorityMap.set(cgs.server.CGSServerConstants.LOAD_USER_GAME_DATA,v4);
		v4;
		var v5 = cgs.server.services.CgsServerApi.LOG_AND_SAVE_NO_DATA;
		this._priorityMap.set(cgs.server.CGSServerConstants.LOG_FAILURE,v5);
		v5;
		var v6 = cgs.server.services.CgsServerApi.LOG_NO_ACTIONS;
		this._priorityMap.set(cgs.server.CGSServerConstants.PAGELOAD,v6);
		v6;
		var v7 = cgs.server.services.CgsServerApi.LOG_PRIORITY_ACTIONS;
		this._priorityMap.set(cgs.server.CGSServerConstants.QUEST_ACTIONS,v7);
		v7;
		var v8 = cgs.server.services.CgsServerApi.LOG_NO_DATA;
		this._priorityMap.set(cgs.server.CGSServerConstants.SAVE_GAME_DATA,v8);
		v8;
		var v9 = cgs.server.services.CgsServerApi.LOG_NO_ACTIONS;
		this._priorityMap.set("quest/start/",v9);
		v9;
		var v10 = cgs.server.services.CgsServerApi.LOG_NO_DATA;
		this._priorityMap.set(cgs.server.CGSServerConstants.SAVE_SCORE,v10);
		v10;
		var v11 = cgs.server.services.CgsServerApi.LOG_NO_DATA;
		this._priorityMap.set(cgs.server.CGSServerConstants.SCORE_REQUEST,v11);
		v11;
		var v12 = cgs.server.services.CgsServerApi.LOG_NO_DATA;
		this._priorityMap.set(cgs.server.CGSServerConstants.USER_FEEDBACK,v12);
		v12;
		var v13 = cgs.server.services.CgsServerApi.LOG_AND_SAVE_NO_DATA;
		this._priorityMap.set(cgs.server.CGSServerConstants.UUID_REQUEST,v13);
		v13;
		if(this._nonConsentingMap == null) this._nonConsentingMap = new haxe.ds.StringMap();
		this._nonConsentingMap.set(cgs.server.CGSServerConstants.PAGELOAD,1);
		1;
		this._nonConsentingMap.set(cgs.server.CGSServerConstants.QUEST_ACTIONS,1);
		1;
		this._nonConsentingMap.set("quest/start/",1);
		1;
	}
	,reset: function() {
		this._initialized = false;
		var serverData = this.getCurrentGameServerData();
		if(serverData != null) {
			var cache = serverData.getCgsCache();
			if(cache != null) {
				this.clearCachedUid();
				cache.reset();
			}
			this.logoutUser();
		}
		this._swfDomain = "";
		this.initDefaultProps();
	}
	,getUid: function() {
		return this.getCurrentGameServerData().getUid();
	}
	,isUidValid: function() {
		return this.getCurrentGameServerData().isUidValid();
	}
	,getUsername: function() {
		return this.getCurrentGameServerData().getUserName();
	}
	,getSessionId: function() {
		var serverData = this.getCurrentGameServerData();
		if(serverData == null) return ""; else return serverData.getSessionId();
	}
	,setSessionId: function(value) {
		var serverData = this.getCurrentGameServerData();
		if(serverData == null) serverData.setSessionId(value);
	}
	,getUserPlayCount: function() {
		return this.getCurrentGameServerData().getUserPlayCount();
	}
	,getUserPreviousPlayCount: function() {
		return this.getCurrentGameServerData().getUserPlayCount() - 1;
	}
	,setLogPriorityChangeCallback: function(callback) {
		this._logPriorityChangeCallback = callback;
	}
	,disableLogging: function() {
		this._loggingDisabled = true;
	}
	,enableLogging: function() {
		this._loggingDisabled = false;
	}
	,setRequireTermsOfService: function(value) {
		this._requireTermsService = value;
	}
	,setTermsServiceAccepted: function(value) {
		this._userAcceptedTOS = value;
	}
	,loggingDisabled: function(method) {
		var priorityLogDisable = false;
		return this._loggingDisabled || this._requireTermsService && !this._userAcceptedTOS || priorityLogDisable;
	}
	,getUserLoggingDisabled: function() {
		if(this._userAuth != null) {
			var userData = this._userAuth.getUserData();
			if(userData.getLoggingType() == cgs.server.data.UserData.NON_CONSENTED_LOGGING) return true;
		}
		return false;
	}
	,isUserMethodDisabled: function(method) {
		if(this._userAuth != null) {
			var userData = this._userAuth.getUserData();
			if(userData.getLoggingType() == cgs.server.data.UserData.NON_CONSENTED_LOGGING) return this._nonConsentingMap.exists(method);
		}
		return false;
	}
	,setActionBufferHandlerClass: function(bufferClass) {
		this._actionBufferHandlerClass = bufferClass;
	}
	,addServerDataProps: function(props) {
		var data = new cgs.server.logging.GameServerData();
		this.setServerProps(props,data);
	}
	,addUserDataProps: function(user,props) {
		var data = new cgs.server.logging.GameServerData();
		this.setUserServerProps(user,props,data);
	}
	,getCurrentGameServerData: function() {
		return this._gameServerData;
	}
	,getGameServerData: function() {
		return this._gameServerData;
	}
	,getUserHandler: function() {
		return this.getCurrentGameServerData().getUserLoggingHandler();
	}
	,getUserLoggingHandler: function() {
		var serverData = this.getCurrentGameServerData();
		if(serverData != null) return serverData.getUserLoggingHandler();
		return null;
	}
	,initializeUser: function(user,props,completeCallback) {
		console.log("initializeUser called");
		if(this._initialized && !this.isProductionRelease()) throw "CgsServer must be reset prior to calling initialize again.";
		this._initialized = true;
		if(completeCallback != null) props.setCompleteCallback(completeCallback);
		this.addUserDataProps(user,props);
		this.setUserDomain(null);
		var logHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		logHandler.initializeUserData(this);
	}
	,setup: function(props,stage) {
		var gameServerData = new cgs.server.logging.GameServerData();
		this.setServerProps(props,gameServerData);
		this.setUserDomain(stage);
	}
	,setupMultiplayerLogging: function(props) {
		var serverData = new cgs.server.logging.GameServerData();
		this.setServerProps(props,serverData);
		var loggingHandler = new cgs.server.logging.UserLoggingHandler(this,null,null,this._actionBufferHandlerClass);
		serverData.setUserLoggingHandler(loggingHandler);
		serverData.setSessionId(cgs.utils.Guid.create());
		var requestId = this.requestUid(null,false,props.getForceUid());
		loggingHandler.setUidRequestId(requestId);
	}
	,setupUserProperties: function(user,props) {
		var gameServerData = new cgs.server.logging.GameServerData();
		this.setUserServerProps(user,props,gameServerData);
	}
	,setUserServerProps: function(user,props,serverData) {
		this.setServerProps(props,serverData);
		var loggingHandler = new cgs.server.logging.UserLoggingHandler(this,user,props,this._actionBufferHandlerClass);
		serverData.setUserLoggingHandler(loggingHandler);
	}
	,setServerProps: function(props,serverData) {
		serverData.setSkey(props.getSkey());
		serverData.setGameName(props.getGameName());
		serverData.setGameId(props.getGameID());
		serverData.setCid(props.getCategoryID());
		serverData.setVersionId(props.getVersionID());
		serverData.setUseDevelopmentServer(props.useDevServer());
		serverData.setSkeyHashVersion(props.getSkeyHashVersion());
		serverData.setExternalAppId(props.getExternalAppId());
		serverData.setServerURL(props.getLoggingUrl());
		serverData.setAbTestingURL(props.getAbTestingUrl());
		serverData.setIntegrationURL(props.getIntegrationUrl());
		serverData.setTimeUrl(props.getTimeUrl());
		serverData.setProxyUrl(props.getProxyUrl());
		serverData.setUseProxy(props.useProxy());
		serverData.setServerVersion(props.getServerVersion());
		serverData.setUidCallback(props.getUidValidCallback());
		serverData.setCgsCache(props.getCgsCache());
		serverData.setSaveCacheDataToServer(props.getSaveCacheDataToServer());
		serverData.setServerTag(props.getServerTag());
		this._gameServerData = serverData;
		serverData.setExperimentId(props.getExperimentId());
		if(js.Boot.__instanceof(props,cgs.user.CgsUserProperties)) {
			var userProps;
			userProps = js.Boot.__cast(props , cgs.user.CgsUserProperties);
			serverData.setLessonId(userProps.getLessonId());
			serverData.setTosServerVersion(userProps.getTosServerVersion());
			serverData.setAuthenticateCachedStudent(userProps.getAuthenticateCachedStudent());
		}
		serverData.setDataLevel(props.getDataLevel());
		if(this._swfDomain != null) serverData.setSwfDomain(this._swfDomain);
		serverData.setLogPriority(props.getLogPriority());
	}
	,setConditionId: function(value) {
		this.getCurrentGameServerData().setConditionId(value);
	}
	,getConditionId: function() {
		return this.getCurrentGameServerData().getConditionId();
	}
	,setExternalAppId: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setExternalAppId(value);
	}
	,getServerData: function() {
		var gameServerData = this.getCurrentGameServerData();
		return gameServerData;
	}
	,setSkey: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setSkey(value);
	}
	,setSkeyHashVersion: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setSkeyHashVersion(value);
	}
	,setGameName: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setGameName(value);
	}
	,setGameID: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setGameId(value);
	}
	,setQuestGameID: function(value) {
		this._questGameID = value;
	}
	,setVersionID: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setVersionId(value);
	}
	,setCategoryID: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setCid(value);
	}
	,setServerURL: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setServerURL(value);
	}
	,setUseDevelopmentServer: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setUseDevelopmentServer(value);
	}
	,setAbTestingURL: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setAbTestingURL(value);
	}
	,setLegacyMode: function(value) {
		var gameServerData = this.getCurrentGameServerData();
		gameServerData.setLegacyMode(value);
	}
	,setUserDomain: function(stage) {
		if(stage == null) {
			this._swfDomain = "na";
			return;
		}
		var domain = stage.root.loaderInfo.url.split("/")[2];
		if(domain == null) domain = ""; else domain = domain;
		if(domain.length == 0) domain = "local";
		this._swfDomain = domain;
		var gameServerData = this.getCurrentGameServerData();
		if(gameServerData != null) gameServerData.setSwfDomain(domain);
	}
	,getServerMessage: function() {
		return new cgs.server.messages.Message(this.getCurrentGameServerData(),this._serverTime);
	}
	,getMessage: function() {
		return this.getServerMessage();
	}
	,genRequest: function(url,method,callback,data,params,extraData,responseClass,dataFormat) {
		if(dataFormat == null) dataFormat = "text";
		var request = new cgs.server.requests.ServerRequest(method,callback,data,params,extraData,dataFormat,url,this.getCurrentGameServerData());
		request.setUrlType(cgs.server.requests.ServerRequest.GENERAL_URL);
		return this._urlRequestHandler.sendUrlRequest(request);
	}
	,request: function(method,callback,message,data,params,extraData,responseClass,dataFormat,uidRequired) {
		if(uidRequired == null) uidRequired = false;
		if(dataFormat == null) dataFormat = "text";
		return this.serverRequest(method,message,data,params,1,extraData,responseClass,cgs.server.requests.ServerRequest.GET,dataFormat,uidRequired,null,callback);
	}
	,userRequest: function(method,message,data,params,type,requestType,extraData,callback) {
		if(requestType == null) requestType = "GET";
		if(type == null) type = -1;
		return this.serverRequest(method,message,data,params,type,extraData,null,requestType,"text",true,null,callback);
	}
	,serverRequest: function(method,message,data,params,type,extraData,responseClass,requestType,dataFormat,uidRequired,responseStatus,callback) {
		if(uidRequired == null) uidRequired = false;
		if(dataFormat == null) dataFormat = "text";
		if(requestType == null) requestType = "GET";
		if(type == null) type = -1;
		if(type < 0) type = 1; else type = type;
		var gameServerData = this.getCurrentGameServerData();
		var request = new cgs.server.requests.ServerRequest(method,callback,data,params,extraData,dataFormat,null,gameServerData);
		request.setMessage(message);
		request.setResponseStatus(responseStatus);
		request.setRequestType(requestType);
		request.setMaxFailures(1);
		request.setUrlType(type);
		if(request.hasClientTimestamp()) {
			request.addReadyHandler($bind(this,this.handleRequestReady));
			request.addRequestDependency(this._serverTime.getTimeRequestDependency());
		}
		if(uidRequired || request.getUidRequired()) {
			request.addReadyHandler($bind(this,this.handleRequestReady));
			request.addRequestDependency(this.getUidRequestDependency());
			request.setUidRequired(true);
		}
		if(request.hasSessionId()) {
			request.addReadyHandler($bind(this,this.handleRequestReady));
			request.addRequestDependency(this.getSessionRequestDependency());
		}
		return this._urlRequestHandler.sendUrlRequest(request);
	}
	,handleRequestReady: function(request) {
		if(js.Boot.__instanceof(request,cgs.server.requests.IServerRequest)) {
			var sRequest;
			sRequest = js.Boot.__cast(request , cgs.server.requests.IServerRequest);
			if(sRequest.hasClientTimestamp()) sRequest.injectClientTimestamp(0);
			if(sRequest.getUidRequired()) sRequest.injectUid();
			if(sRequest.hasSessionId()) sRequest.injectSessionId(this._gameServerData.getSessionId());
		}
	}
	,isRequestDataReady: function(request,gameServerData,uidRequired) {
		return (this._serverTime.isTimeValid() || !request.hasClientTimestamp()) && (gameServerData.isUidValid() || !uidRequired);
	}
	,sendRequest: function(request) {
		return this._urlRequestHandler.sendUrlRequest(request);
	}
	,createRequest: function(method,message,data,passThroughData,type,requestType,callback) {
		if(requestType == null) requestType = "GET";
		if(type == null) type = -1;
		return this.createServerRequest(method,message,data,null,type,passThroughData,null,requestType,"text",false,null,callback);
	}
	,createServerRequest: function(method,message,data,params,type,extraData,responseClass,requestType,dataFormat,uidRequired,responseStatus,callback) {
		if(uidRequired == null) uidRequired = false;
		if(dataFormat == null) dataFormat = "text";
		if(requestType == null) requestType = "GET";
		if(type == null) type = -1;
		var gameServerData = this.getCurrentGameServerData();
		var request = new cgs.server.requests.ServerRequest(method,callback,data,params,extraData,dataFormat,null,gameServerData);
		request.setMessage(message);
		request.setResponseStatus(responseStatus);
		request.setRequestType(requestType);
		request.setUrlType(type);
		return request;
	}
	,createUserRequest: function(method,message,data,params,type,requestType,extraData,callback) {
		if(requestType == null) requestType = "GET";
		if(type == null) type = -1;
		return this.createServerRequest(method,message,data,params,type,extraData,null,requestType,"text",true,null,callback);
	}
	,createAbRequest: function(method,callback,data,params,extraData,responseClass,dataFormat,uidRequired) {
		if(uidRequired == null) uidRequired = false;
		if(dataFormat == null) dataFormat = "TEXT";
		return this.createServerRequest(method,null,data,params,cgs.server.requests.ServerRequest.AB_TESTING_URL,extraData,responseClass,cgs.server.requests.ServerRequest.GET,dataFormat,uidRequired,null,callback);
	}
	,integrationRequest: function(method,callback,message,data,params,extraData,responseClass,dataFormat,uidRequired,status) {
		if(uidRequired == null) uidRequired = false;
		if(dataFormat == null) dataFormat = "text";
		this.serverRequest(method,message,data,params,cgs.server.requests.ServerRequest.INTEGRATION_URL,extraData,responseClass,cgs.server.requests.ServerRequest.GET,dataFormat,uidRequired,status,callback);
	}
	,abRequest: function(method,callback,data,params,extraData,responseClass,dataFormat,uidRequired) {
		if(uidRequired == null) uidRequired = false;
		if(dataFormat == null) dataFormat = "TEXT";
		this.serverRequest(method,null,data,params,cgs.server.requests.ServerRequest.AB_TESTING_URL,extraData,responseClass,cgs.server.requests.ServerRequest.GET,dataFormat,uidRequired,null,callback);
	}
	,getClientTimestamp: function() {
		if(this._serverTime == null) return 0;
		return this._serverTime.getClientTimeStamp();
	}
	,getOffsetClientTimestamp: function(localTime) {
		if(this._serverTime == null) return 0;
		return this._serverTime.getOffsetClientTimeStamp(localTime);
	}
	,getServerTime: function() {
		return this._serverTime;
	}
	,setNtpTime: function(value) {
		this._serverTime = value;
	}
	,isServerTimeValid: function(callback) {
		if(callback == null) return;
		if(this._serverTime != null) this._serverTime.addTimeValidCallback(callback);
	}
	,isAuthenticated: function(callback,saveCacheDataToServer) {
		if(saveCacheDataToServer == null) saveCacheDataToServer = true;
		this.getUserLoggingHandler().isAuthenticated($bind(this,this.isUserAuthenticated),this,callback,saveCacheDataToServer);
	}
	,isUserAuthenticated: function(callback) {
		return this.serverRequest(cgs.server.CGSServerConstants.AUTHENTICATED,null,null,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,callback,null,cgs.server.requests.ServerRequest.GET,"text",false,new cgs.server.responses.CgsResponseStatus(this.getGameServerData()),$bind(this,this.handleUserAuthentication));
	}
	,authenticateUser: function(userName,password,authKey,callback,saveCacheDataToServer) {
		if(saveCacheDataToServer == null) saveCacheDataToServer = true;
		this.authenticateUserName(userName,password,authKey,callback);
	}
	,authenticateUserName: function(userName,password,authKey,callback) {
		this._initialized = true;
		var logHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		logHandler.authenticateUserName(userName,password,null,$bind(this,this.userInitAuthUser),this,callback);
	}
	,userInitAuthUser: function(userName,password,authKey,callback) {
		var data = { mem_login : userName, mem_pcode : password};
		this.getCurrentGameServerData().setUserName(userName);
		return this.serverRequest(cgs.server.CGSServerConstants.AUTHENTICATE_USER,null,data,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,callback,null,cgs.server.requests.ServerRequest.GET,"text",false,new cgs.server.responses.CgsResponseStatus(this.getCurrentGameServerData()),$bind(this,this.handleUserAuthentication));
	}
	,handleUserAuthentication: function(status) {
		var callback = status.getPassThroughData();
		var uid = null;
		if(status.success()) {
			var responseObj = status.getData();
			var userData = new cgs.server.data.UserData();
			var memberData = responseObj.member;
			if((memberData instanceof Array) && memberData.__enum__ == null) memberData = (js.Boot.__cast(memberData , Array))[0]; else if(Object.prototype.hasOwnProperty.call(memberData,"0")) memberData = Reflect.field(memberData,"0");
			userData.parseJsonData(memberData);
			this._userAuth = new cgs.server.data.UserAuthData();
			this._userAuth.parseJsonData(memberData);
			this._userAuth.setUserData(userData);
			this.getCurrentGameServerData().setUserAuthentication(this._userAuth);
			this._userDataManager.addUserData(userData);
			uid = this._userAuth.getUid();
		}
		if(callback != null) callback(status,uid);
	}
	,registerUser: function(name,password,email,userCallback) {
		var _g = this;
		var data = { mem_login : name, mem_pcode : password, mem_email : email, role_id : 3};
		this.serverRequest(cgs.server.CGSServerConstants.REGISTER_USER,null,data,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,userCallback,null,cgs.server.requests.ServerRequest.POST,"text",false,new cgs.server.responses.CgsResponseStatus(this.getCurrentGameServerData()),function(status) {
			_g.handleUserRegistration(name,password,status,userCallback);
		});
	}
	,createAccount: function(name,password,email,userCallback) {
		var data = { mem_login : name, mem_pcode : password, mem_email : email, role_id : 3, uid : this.getUid()};
		this.serverRequest(cgs.server.CGSServerConstants.REGISTER_USER,null,data,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,userCallback,null,cgs.server.requests.ServerRequest.POST,"text",false,new cgs.server.responses.CgsResponseStatus(this.getCurrentGameServerData()),function(status) {
			if(userCallback != null) userCallback(status);
		});
	}
	,handleUserRegistration: function(userName,password,status,userCallback) {
		if(status.success()) this.authenticateUser(userName,password,null,userCallback); else if(userCallback != null) {
			var userStatus = new cgs.server.responses.CgsUserResponse(null);
			userStatus.setRegistrationResponse(status);
			userCallback(userStatus);
		}
	}
	,checkUserNameAvailable: function(name,userCallback) {
		var data = { mem_login : name};
		this.serverRequest(cgs.server.CGSServerConstants.CHECK_USER_NAME_AVAILABLE,null,data,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,userCallback,null,cgs.server.requests.ServerRequest.GET,"text",false,new cgs.server.responses.CgsResponseStatus(this.getCurrentGameServerData()),function(status) {
			userCallback(status);
		});
	}
	,logoutUser: function() {
		this._userAuth = null;
		this.getCurrentGameServerData().setUserAuthentication(null);
	}
	,requestMembersByGroupId: function(groupId,callback) {
		if(this._userAuth == null && !this.isProductionRelease()) throw "User must be authenticated prior to getting group members.";
		var message = { group_id : groupId, ext_s_id : this._userAuth.getExternalSourceId()};
		this.integrationRequest(cgs.server.CGSServerConstants.GET_MEMBER_BY_GROUP_ID,$bind(this,this.handleMembersByGroupIdResponse),null,message,null,[groupId,callback]);
	}
	,handleMembersByGroupIdResponse: function(response) {
		var params = response.getPassThroughData();
		if(!response.failed()) {
			var groupId = params[0];
			var groupData = this._userDataManager.getGroupData(groupId);
			if(groupData == null) {
				groupData = new cgs.server.data.GroupData();
				groupData.setId(groupId);
				this._userDataManager.addGroupData(groupData);
			}
			var responseObj = response.getData();
			var currUserData;
			var members = responseObj.members;
			var memberUids = [];
			var _g = 0;
			while(_g < members.length) {
				var memberObj = members[_g];
				++_g;
				currUserData = this._userDataManager.getUserData(memberObj.uid);
				if(currUserData == null) {
					currUserData = new cgs.server.data.UserData();
					currUserData.parseJsonData(memberObj);
					this._userDataManager.addUserData(currUserData);
				} else currUserData.parseJsonData(memberObj);
				memberUids.push(memberObj.uid);
			}
			groupData.setUserUids(memberUids);
		}
		var callback = params[1];
		if(callback != null) callback(response);
	}
	,retrieveUserAssignments: function(callback) {
		if(this._userAuth == null && callback != null) callback(true);
		var message = this.getServerMessage();
		message.addProperty("uid",this._userAuth.getUid());
		this.integrationRequest(cgs.server.CGSServerConstants.RETRIEVE_HOMEPLAY_ASSIGNMENTS_FOR_STUDENT,$bind(this,this.handleHomeplayResponse),message,null,null,callback,null,"text",true,new cgs.server.responses.HomeplayResponse());
	}
	,handleHomeplayResponse: function(response) {
		this._userDataManager.addUserHomeplayData(response.getHomeplays(),this._userAuth.getUid());
		var callback = response.getPassThroughData();
		if(callback != null) callback(response);
	}
	,requestUserTestConditions: function(existing,callback) {
		if(existing == null) existing = false;
		this.getUserLoggingHandler().requestUserTestConditions(existing,callback);
	}
	,noUserConditions: function() {
		var logHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		logHandler.noUserConditions();
	}
	,logTestStart: function(testId,conditionId,detail,callback) {
		var logHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		logHandler.logTestStart(testId,conditionId,detail,callback);
	}
	,logTestEnd: function(testId,conditionId,detail,callback) {
		var logHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		logHandler.logTestEnd(testId,conditionId,detail,callback);
	}
	,logConditionVariableStart: function(testId,conditionId,varId,resultId,time,detail,callback) {
		if(time == null) time = -1;
		var logHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		logHandler.logConditionVariableStart(testId,conditionId,varId,resultId,time,detail,callback);
	}
	,logConditionVariableResults: function(testId,conditionId,variableId,resultId,time,detail,callback) {
		if(time == null) time = -1;
		var logHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		logHandler.logConditionVariableResults(testId,conditionId,variableId,resultId,time,detail,callback);
	}
	,createUidForExternalId: function(callback,externalID) {
	}
	,requestUidForExternalId: function(externalId,callback) {
		var message = this.getServerMessage();
	}
	,requestUid: function(callback,cacheUUID,forceName) {
		if(cacheUUID == null) cacheUUID = false;
		if(this._userAuth != null) {
			if(callback != null) callback(new cgs.server.responses.UidResponseStatus());
			return -1;
		}
		var uidSet = false;
		var gameServerData = this.getCurrentGameServerData();
		if(forceName != null) {
			gameServerData.setUid(forceName);
			if(cacheUUID) this.saveUid(forceName,gameServerData.getGameName());
			uidSet = true;
		}
		if(cacheUUID) {
			var uuid = this.loadUid(gameServerData.getGameName());
			if(uuid != null) {
				gameServerData.setUid(uuid);
				uidSet = true;
			}
		}
		if(uidSet) {
			if(callback != null) {
				var response = new cgs.server.responses.UidResponseStatus();
				response.setCacheUid(this.getUid());
				callback(response);
			}
			return -1;
		}
		var uuidRequest = new cgs.server.logging.requests.UUIDRequest(callback,cacheUUID,this.getCurrentGameServerData());
		var message = this.getServerMessage();
		message.injectGameParams();
		message.injectCategoryId();
		return this.serverRequest(cgs.server.CGSServerConstants.UUID_REQUEST,message,null,null,1,uuidRequest,null,cgs.server.requests.ServerRequest.POST,"text",false,new cgs.server.responses.UidResponseStatus(),$bind(this,this.handleUidLoaded));
	}
	,handleUidLoaded: function(response) {
		var request = response.getPassThroughData();
		var uuid = "";
		var uuidFailed = response.failed();
		var gameServerData = request.getGameServerData();
		try {
			var urlVars = new cgs.http.UrlVariables(response.getRawData());
			var uuidObject = cgs.utils.Json.decode(urlVars.getParameter("data"));
			uuid = uuidObject.uid;
			gameServerData.setUid(uuid);
		} catch( er ) {
			uuidFailed = true;
		}
		var cacheUUID = request.cacheUUID;
		if(cacheUUID && !uuidFailed) this.saveUid(uuid,gameServerData.getGameName());
		var callback = request.getCallback();
		if(callback != null) callback(response);
	}
	,getLocalCache: function() {
		if(this._localCache == null && this._cacheFactory != null) {
			console.log("Creating local cache");
			this._localCache = this._cacheFactory.createLocalCache();
		}
		return this._localCache;
	}
	,getUserCache: function() {
		var serverData = this.getCurrentGameServerData();
		var cache = serverData.getCgsCache();
		if(cache == null) {
			console.log("Cache is null, creating local cache");
			cache = this.getLocalCache();
		}
		return cache;
	}
	,saveUid: function(uuid,gameName) {
		var serverData = this.getCurrentGameServerData();
		if(serverData == null || serverData.getSaveCacheDataToServer()) return;
		var cache = this.getUserCache();
		if(cache != null) cache.setSave(this.getUidCacheName(gameName),uuid);
	}
	,loadUid: function(gameName) {
		var serverData = this.getCurrentGameServerData();
		if(serverData == null) return null;
		var cache = this.getUserCache();
		if(cache == null) {
			console.log("User cache is null");
			return null;
		}
		if(cache.saveExists("cgs_uid")) this.migrateCacheName();
		return cache.getSave(this.getUidCacheName(gameName));
	}
	,containsUid: function() {
		var serverData = this.getCurrentGameServerData();
		if(serverData == null) return false;
		var cache = this.getUserCache();
		if(cache == null) return false;
		if(cache.saveExists("cgs_uid")) this.migrateCacheName();
		return cache.saveExists(this.getUidCacheName(serverData.getGameName()));
	}
	,clearCachedUid: function() {
		var serverData = this.getCurrentGameServerData();
		if(serverData == null || serverData.getSaveCacheDataToServer()) return;
		var cache = this.getUserCache();
		if(cache != null) cache.deleteSave(this.getUidCacheName(serverData.getGameName()));
	}
	,migrateCacheName: function() {
		var serverData = this.getCurrentGameServerData();
		if(serverData == null || serverData.getSaveCacheDataToServer()) return;
		var cache = this.getUserCache();
		if(cache != null) {
			var currUid = cache.getSave("cgs_uid");
			cache.deleteSave("cgs_uid");
			this.saveUid(currUid,serverData.getGameName());
		}
	}
	,getUidCacheName: function(gameName) {
		var cacheName = "cgs_uid";
		if(gameName != null) cacheName += "_" + gameName; else cacheName += "_default";
		return cacheName;
	}
	,logActionNoQuest: function(action,callback) {
		this.localLogAction(action,-1,null,callback);
	}
	,logMultiplayerAction: function(action,multiSeqId,callback) {
		this.localLogAction(action,multiSeqId,null,callback);
	}
	,logServerMultiplayerAction: function(action,multiSeqId,multiUid,callback) {
		this.localLogAction(action,multiSeqId,multiUid,callback);
	}
	,localLogAction: function(action,multiSeqId,multiUid,callback) {
		if(multiSeqId == null) multiSeqId = -1;
		this.getUserLoggingHandler().logAction(action,callback,multiSeqId,multiUid);
	}
	,logPageLoad: function(details,callback,multiSeqId) {
		if(multiSeqId == null) multiSeqId = -1;
		if(this.getUserLoggingDisabled()) {
			if(callback != null) callback(null,false);
			return -1;
		}
		var request = new cgs.server.requests.PageloadRequest(this,details,callback);
		request.makeRequests(null);
		return request.getRequestId();
	}
	,submitUserFeedback: function(feedback,callback) {
		var userHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		userHandler.submitUserFeedback(feedback,callback);
	}
	,requestDqid: function(callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		var dqidRequest = new cgs.server.logging.requests.DQIDRequest(localDqid,callback);
		var message = this.getServerMessage();
		message.injectGameParams();
		message.injectSKEY();
		return this.serverRequest(cgs.server.CGSServerConstants.DQID_REQUEST,message,null,null,1,dqidRequest,null,cgs.server.requests.ServerRequest.GET,"text",false,new cgs.server.responses.DqidResponseStatus(),callback);
	}
	,createQuest: function(questName,questTypeID,callback) {
		var message = new cgs.server.logging.messages.CreateQuestRequest(questName,questTypeID);
		message.injectParams();
		var callbackData = new cgs.server.logging.requests.CallbackRequest(callback,this.getCurrentGameServerData());
		this.request(cgs.server.CGSServerConstants.CREATE_QUEST,$bind(this,this.handleCreateQuestResponse),message,null,null,callbackData);
	}
	,handleCreateQuestResponse: function(data,failed,request) {
		var callback = request.getCallback();
		if(failed) {
			if(callback != null) callback(-1,true);
		} else try {
			var urlVariables = new cgs.http.UrlVariables(data);
			var jsonObject = cgs.utils.Json.decode(urlVariables.getParameter("data"));
			var questData = jsonObject.rdata;
			var qid = questData.qid;
			if(callback != null) callback(qid,false);
		} catch( er ) {
			if(callback != null) callback(-1,true);
		}
	}
	,startLoggingQuestActions: function(questId,dqid,localDqid) {
		if(localDqid == null) localDqid = -1;
		var userHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		return userHandler.startLoggingQuestActions(questId,dqid,localDqid);
	}
	,endLoggingQuestActions: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		var userHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		return userHandler.endLoggingQuestActions(localDqid);
	}
	,logQuestStartWithDQID: function(questID,questHash,dqid,details,aeSeqID,localDQID) {
		if(localDQID == null) localDQID = -1;
		var userHandler = this.getCurrentGameServerData().getUserLoggingHandler();
		return userHandler.logQuestStartWithDQID(questID,questHash,dqid,details,null,aeSeqID,localDQID);
	}
	,logQuestStart: function(questID,questHash,details,callback,aeSeqID,localDQID) {
		if(localDQID == null) localDQID = -1;
		return this.getUserLoggingHandler().logQuestStart(questID,questHash,details,callback,aeSeqID,localDQID);
	}
	,logMultiplayerQuestStart: function(questId,questHash,details,parentDqid,multiSeqId,callback,aeSeqId,localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.getUserLoggingHandler().logMultiplayerQuestStart(questId,questHash,details,parentDqid,multiSeqId,callback,aeSeqId,localDqid);
	}
	,createMultiplayerQuestStartRequest: function(questId,questHash,details,parentDqid,multiSeqId,callback,aeSeqId,localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.getUserLoggingHandler().createQuestStartRequest(questId,questHash,details,callback,aeSeqId,localDqid,null,parentDqid,-1,-1,-1,-1,multiSeqId);
	}
	,logForeignQuestStart: function(dqid,foreignGameId,foreignCategoryId,foreignVersionId,foreignConditionId,details,callback) {
		if(foreignConditionId == null) foreignConditionId = 0;
		this.getUserLoggingHandler().logForeignQuestStart(dqid,foreignGameId,foreignCategoryId,foreignVersionId,foreignConditionId,details,callback);
	}
	,logLinkedQuestStart: function(questId,questHash,linkGameId,linkCategoryId,linkVersionId,linkConditionId,details,callback,aeSeqId,localDqid) {
		if(localDqid == null) localDqid = -1;
		if(linkConditionId == null) linkConditionId = 0;
		return this.getUserLoggingHandler().logLinkedQuestStart(questId,questHash,linkGameId,linkCategoryId,linkVersionId,linkConditionId,details,callback,aeSeqId,localDqid);
	}
	,logQuestEnd: function(details,callback,localDQID) {
		if(localDQID == null) localDQID = -1;
		this.getUserLoggingHandler().logQuestEnd(details,localDQID,callback);
	}
	,logMultiplayerQuestEnd: function(details,parentDqid,multiSeqId,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		this.getUserLoggingHandler().logMultiplayerQuestEnd(details,parentDqid,multiSeqId,localDqid,callback);
	}
	,createMultiplayerQuestEndRequest: function(details,parentDqid,multiSeqId,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.getUserLoggingHandler().createQuestEndRequest(details,localDqid,callback,parentDqid,multiSeqId);
	}
	,hasQuestLoggingStarted: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.getUserLoggingHandler().hasQuestLoggingStarted(localDqid);
	}
	,isQuestActive: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.hasQuestLoggingStarted(localDqid);
	}
	,logMultiplayerQuestAction: function(action,multiSeqId,localDqid,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDqid == null) localDqid = -1;
		action.setMultiplayerSequenceId(multiSeqId);
		this.logQuestAction(action,localDqid,forceFlush);
	}
	,logServerMultiplayerQuestAction: function(action,multiSeqId,multiUid,localDqid,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDqid == null) localDqid = -1;
		action.setMultiplayerSequenceId(multiSeqId);
		action.setMultiplayerUid(multiUid);
		this.logQuestAction(action,localDqid,forceFlush);
	}
	,logQuestAction: function(action,localDQID,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDQID == null) localDQID = -1;
		this.getUserLoggingHandler().logQuestAction(action,localDQID,forceFlush);
	}
	,logQuestActionData: function(action,localDqid,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDqid == null) localDqid = -1;
		this.getUserLoggingHandler().logQuestActionData(action,localDqid,forceFlush);
	}
	,flushActions: function(localDQID,callback) {
		if(localDQID == null) localDQID = -1;
		this.getUserLoggingHandler().flushActions(localDQID,callback);
	}
	,logQuestScore: function(score,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		this.getUserLoggingHandler().logQuestScore(score,callback,localDqid);
	}
	,logScore: function(score,questId,callback) {
		this.getUserLoggingHandler().logScore(score,questId,callback);
	}
	,requestScores: function() {
	}
	,saveGameData: function(dataID,data,localSaveId,callback) {
		if(localSaveId == null) localSaveId = -1;
		var message = this.getServerMessage();
		message.addProperty("udata_id",dataID);
		message.addProperty("data_detail",data);
		message.injectParams();
		var dataRequest = new cgs.server.logging.requests.GameDataRequest(callback,dataID,localSaveId);
		this.userRequest(cgs.server.CGSServerConstants.SAVE_GAME_DATA,message,null,null,1,cgs.server.requests.ServerRequest.POST,dataRequest,$bind(this,this.handleGameDataSaved));
	}
	,handleGameDataSaved: function(response) {
		var dataRequest = response.getPassThroughData();
		var callback = dataRequest.getCallback();
		var dataID = dataRequest.dataId;
		if(callback != null) callback(dataID,response.failed(),dataRequest.saveId);
	}
	,batchSaveGameData: function(dataMap,saveKey,localSaveId,callback) {
		if(localSaveId == null) localSaveId = -1;
		var message = this.getServerMessage();
		message.injectParams();
		var dataIds = [];
		var saveData = [];
		var $it0 = dataMap.keys();
		while( $it0.hasNext() ) {
			var dataId = $it0.next();
			saveData.push({ data_id : dataId, data : dataMap.get(dataId)});
			dataIds.push(dataId);
		}
		if(saveData.length == 0) return;
		message.addProperty("save_data",saveData);
		if(saveKey != null) message.addProperty("save_key",saveKey);
		this.userRequest(cgs.server.CGSServerConstants.BATCH_APP_GAME_DATA,message,null,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,cgs.server.requests.ServerRequest.POST,null,function(response) {
			if(callback != null) callback(dataIds,response.failed(),localSaveId);
		});
	}
	,loadGameSaveData: function(callback,saveKey) {
		var message = this.getServerMessage();
		message.injectParams();
		if(saveKey != null) message.addProperty("save_key",saveKey);
		this.serverRequest(cgs.server.CGSServerConstants.LOAD_USER_APP_SAVE_DATA_V2,message,null,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,null,null,cgs.server.requests.ServerRequest.GET,"text",true,new cgs.server.responses.GameUserDataResponseStatus(true),function(response) {
			if(callback != null) callback(response);
		});
	}
	,loadGameData: function(callback,loadByCid) {
		if(loadByCid == null) loadByCid = false;
		var message = this.getServerMessage();
		message.injectParams();
		var callbackRequest = new cgs.server.logging.requests.CallbackRequest(callback,this.getCurrentGameServerData());
		var serverMethod;
		if(loadByCid) serverMethod = cgs.server.CGSServerConstants.LOAD_USER_GAME_SERVER_DATA; else serverMethod = cgs.server.CGSServerConstants.LOAD_USER_GAME_DATA;
		this.serverRequest(serverMethod,message,null,null,1,callbackRequest,null,cgs.server.requests.ServerRequest.GET,"text",true,new cgs.server.responses.GameUserDataResponseStatus(true),$bind(this,this.handleGameDataLoaded));
	}
	,handleGameDataLoaded: function(response) {
		var callbackRequest = response.getPassThroughData();
		var callback = callbackRequest.getCallback();
		if(callback != null) callback(response);
	}
	,loadGameDataByID: function(dataID,callback) {
		var message = this.getServerMessage();
		message.addProperty("udata_id",dataID);
		message.injectParams();
		var callbackRequest = new cgs.server.logging.requests.GameDataRequest(callback,dataID);
		this.serverRequest(cgs.server.CGSServerConstants.LOAD_GAME_DATA,message,null,null,1,callbackRequest,null,cgs.server.requests.ServerRequest.GET,"text",true,new cgs.server.responses.GameUserDataResponseStatus(false),$bind(this,this.handleGameDataLoadByID));
	}
	,handleGameDataLoadByID: function(response) {
		var request = response.getPassThroughData();
		var callback = request.getCallback();
		if(callback != null) callback(response.getUserGameDataChunk(),response.failed());
	}
	,tosResponseExists: function() {
		var gameData = this.getCurrentGameServerData();
		return gameData != null && gameData.getCgsCache().saveExists(cgs.server.CGSServerConstants.TOS_DATA_ID);
	}
	,saveTosStatus: function(accepted,tosVersion,tosHash,languageCode,callback) {
		var timeStamp = Math.round(new Date().getTime() / 1000);
		var gameServerData = this.getCurrentGameServerData();
		var saveObject = { sessionid : gameServerData.getSessionId(), accepted : accepted, version : tosVersion, timestamp : timeStamp, hash : tosHash, language : languageCode};
		this.saveGameData(cgs.server.CGSServerConstants.TOS_DATA_ID,saveObject,-1,callback);
	}
	,requestLoggingData: function(method,dataParams,callback,returnType) {
		if(returnType == null) returnType = "TEXT";
		var message = this.getServerMessage();
		var _g = 0;
		var _g1 = Reflect.fields(dataParams);
		while(_g < _g1.length) {
			var key = _g1[_g];
			++_g;
			message.addProperty(key,Reflect.field(dataParams,key));
		}
		message.injectParams();
		var callbackRequest = new cgs.server.logging.requests.CallbackRequest(callback,this.getCurrentGameServerData(),returnType);
		this.userRequest(method,message,null,null,1,cgs.server.requests.ServerRequest.GET,callbackRequest,$bind(this,this.handleLoggingDataLoaded));
	}
	,handleLoggingDataLoaded: function(response) {
		var callbackRequest = response.getPassThroughData();
		var callback = callbackRequest.getCallback();
		if(callback != null) callback(response);
	}
	,requestQuestData: function(dqid,callback) {
		var dataRequest = new cgs.server.logging.requests.QuestDataRequest(this,dqid,callback);
		dataRequest.makeRequests(this._urlRequestHandler);
	}
	,parseResponseData: function(rawData,returnDataType) {
		if(returnDataType == null) returnDataType = "JSON";
		var data = null;
		try {
			var urlVars = new cgs.http.UrlVariables(rawData);
			var dataString = urlVars.data;
			if(returnDataType == "JSON") data = cgs.utils.Json.decode(dataString); else data = dataString;
			if(urlVars.containsParameter("server_data")) {
				var serverDataRaw = urlVars.getParameter("serverData");
				var serverData = cgs.utils.Json.decode(serverDataRaw);
				if(Object.prototype.hasOwnProperty.call(serverData,"pvid")) this._currentResponseVersion = serverData.pvid; else this._currentResponseVersion = 0;
			} else {
				this._currentResponseVersion = 0;
				if(returnDataType == "JSON") {
				}
			}
		} catch( er ) {
		}
		return data;
	}
	,didRequestFail: function(dataObject) {
		if(dataObject == null) return true;
		var failed = true;
		if(Object.prototype.hasOwnProperty.call(dataObject,"tstatus")) failed = dataObject.tstatus != "t";
		return failed;
	}
	,onTick: function(delta) {
	}
	,authenticateStudent: function(username,password,teacherCode,gradeLevel,callback,saveCacheDataToServer) {
		if(saveCacheDataToServer == null) saveCacheDataToServer = true;
		if(gradeLevel == null) gradeLevel = -1;
		this._initialized = true;
		this.getUserLoggingHandler().authenticateUser(username,password,teacherCode,gradeLevel,$bind(this,this.userInitAuthStudent),this,callback,saveCacheDataToServer);
	}
	,userInitAuthStudent: function(username,password,teacherCode,callback,gradeLevel) {
		if(gradeLevel == null) gradeLevel = 0;
		var data = { mem_login : username, teacher_code : teacherCode, grade_level : gradeLevel};
		if(password != null) data.mem_pcode = password;
		var gameSaveData = this.getCurrentGameServerData();
		gameSaveData.setUserName(username);
		var method;
		if(gameSaveData.getAuthenticateCachedStudent()) method = cgs.server.CGSServerConstants.AUTHENTICATE_CACHED_STUDENT; else method = cgs.server.CGSServerConstants.AUTHENTICATE_STUDENT;
		return this.serverRequest(method,null,data,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,callback,null,cgs.server.requests.ServerRequest.POST,"text",false,new cgs.server.responses.CgsResponseStatus(this.getCurrentGameServerData()),$bind(this,this.handleUserAuthentication));
	}
	,registerStudent: function(username,teacherCode,gradeLevel,userCallback) {
		if(gradeLevel == null) gradeLevel = 0;
		var _g = this;
		var data = { mem_login : username, teacher_code : teacherCode};
		if(gradeLevel != 0) data.grade = gradeLevel;
		this.serverRequest(cgs.server.CGSServerConstants.REGISTER_STUDENT,null,data,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,userCallback,null,cgs.server.requests.ServerRequest.POST,"text",false,new cgs.server.responses.CgsResponseStatus(this.getCurrentGameServerData()),function(status) {
			_g.handleStudentRegistration(username,teacherCode,status,userCallback);
		});
	}
	,handleStudentRegistration: function(username,teacherCode,status,userCallback) {
		if(status.success()) this.authenticateStudent(username,null,teacherCode,0,userCallback); else if(userCallback != null) {
			var userResponse = new cgs.server.responses.CgsUserResponse(null,null);
			userResponse.setAuthorizationResponse(status);
			userCallback(userResponse);
		}
	}
	,setLessonId: function(id) {
		this.getGameServerData().setLessonId(id);
	}
	,containsTosItemData: function(tosKey,languageCode,version) {
		if(version == null) version = -1;
		if(languageCode == null) languageCode = "en";
		return this._tosData.containsTos(tosKey,languageCode,version);
	}
	,getTosItemData: function(tosKey,languageCode,version) {
		if(version == null) version = -1;
		if(languageCode == null) languageCode = "en";
		return this._tosData.getTosData(tosKey,languageCode,version);
	}
	,getUserTosStatus: function() {
		return this.getCurrentGameServerData().getUserTosStatus();
	}
	,containsUserTosStatus: function() {
		return this.getCurrentGameServerData().containsUserTosStatus();
	}
	,loadUserTosStatus: function(tosKey,callback,languageCode,gradeLevel) {
		if(gradeLevel == null) gradeLevel = 0;
		if(languageCode == null) languageCode = "en";
		var _g = this;
		var message = this.getServerMessage();
		message.injectParams();
		message.addProperty("tos_key",tosKey);
		message.addProperty("lan_code",languageCode);
		message.addProperty("grade_level",gradeLevel);
		var method = cgs.server.CGSServerConstants.TOS_USER_STATUS;
		if(this.getGameServerData().getTosServerVersion() == 2) method = cgs.server.CGSServerConstants.TOS_USER_STATUS_V2;
		this.serverRequest(method,message,null,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,null,null,cgs.server.requests.ServerRequest.GET,"text",true,new cgs.server.responses.TosResponseStatus(this._tosData,tosKey,this.getCurrentGameServerData()),function(response) {
			_g._tosData.addTosDataItems(response.getTosItemData());
			if(callback != null) callback(response);
		});
	}
	,updateUserTosStatus: function(userStatus,callback) {
		var message = this.getServerMessage();
		message.injectParams();
		message.injectSessionId();
		message.injectClientTimeStamp();
		message.addProperty("accepted",userStatus.getAccepted()?1:0);
		message.addProperty("tos_key",userStatus.getTosKey());
		message.addProperty("tos_version",userStatus.getTosVersion());
		message.addProperty("language_code",userStatus.getTosLanguageCode());
		message.addProperty("tos_hash",userStatus.getTosMd5Hash());
		var method = cgs.server.CGSServerConstants.TOS_USER_UPDATE;
		if(this.getGameServerData().getTosServerVersion() == 2) method = cgs.server.CGSServerConstants.TOS_USER_UPDATE_V2;
		this.serverRequest(method,message,null,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,null,null,cgs.server.requests.ServerRequest.POST,"text",true,null,callback);
	}
	,exemptUserFromTos: function(callback) {
		this.localExemptUserFromTos(this.getGameServerData().getTosServerVersion(),callback);
	}
	,localExemptUserFromTos: function(version,callback) {
		var message = this.getServerMessage();
		message.injectParams();
		message.injectSessionId();
		message.injectClientTimeStamp();
		var method = cgs.server.CGSServerConstants.TOS_USER_EXEMPT;
		if(version == 2) method = cgs.server.CGSServerConstants.TOS_USER_EXEMPT_V2;
		this.serverRequest(method,message,null,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,null,null,cgs.server.requests.ServerRequest.POST,"text",true,null,callback);
	}
	,loadTos: function(tosKey,languageCode,version,callback) {
		if(version == null) version = -1;
		if(languageCode == null) languageCode = "en";
		var message = this.getServerMessage();
		message.injectParams();
		message.addProperty("tos_key",tosKey);
		message.addProperty("language_code",languageCode);
		if(version >= 0) message.addProperty("version",version);
		this.serverRequest(cgs.server.CGSServerConstants.TOS_REQUEST,message,null,null,cgs.server.requests.ServerRequest.INTEGRATION_URL,null,null,cgs.server.requests.ServerRequest.POST,"text",true,new cgs.server.responses.TosResponseStatus(this._tosData,tosKey,this.getCurrentGameServerData()),function(response) {
		});
	}
	,containsTos: function(tosKey,languageCode,version) {
		if(version == null) version = -1;
		if(languageCode == null) languageCode = "en";
		return this._tosData.containsTos(tosKey,languageCode,version);
	}
	,userTosRequired: function() {
		var userTosStatus = this.getCurrentGameServerData().getUserTosStatus();
		if(userTosStatus != null) return userTosStatus.isAcceptanceRequired(); else return false;
	}
	,getUserData: function() {
		if(this._userAuth != null) return this._userAuth.getUserData(); else return null;
	}
	,isDqidValid: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.getUserLoggingHandler().isDqidValid(localDqid);
	}
	,getDqidRequestId: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.getUserLoggingHandler().getDqidRequestId(localDqid);
	}
	,getDqid: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.getUserLoggingHandler().getDqid(localDqid);
	}
	,addDqidCallback: function(callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		this.getUserLoggingHandler().addDqidCallback(callback,localDqid);
	}
	,getQuestLogger: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this.getUserLoggingHandler().getQuestLog(localDqid);
	}
	,logHomeplayQuestStart: function(questId,questHash,questDetails,homeplayId,homeplayDetails,localDqid,callback) {
		if(localDqid == null) localDqid = -1;
		return this.getUserLoggingHandler().logHomeplayQuestStart(questId,questHash,questDetails,homeplayId,homeplayDetails,localDqid,callback);
	}
	,logHomeplayQuestComplete: function(questDetails,homeplayId,homeplayDetails,homeplayCompleted,localDqid,callback) {
		if(localDqid == null) localDqid = -1;
		if(homeplayCompleted == null) homeplayCompleted = false;
		this.getUserLoggingHandler().logHomeplayQuestComplete(questDetails,homeplayId,homeplayDetails,homeplayCompleted,localDqid,callback);
	}
	,hasPendingLogs: function() {
		return false;
	}
	,__class__: cgs.server.services.CgsServerApi
};
cgs.server.services.IMultiplayerLoggingService = function() { };
cgs.server.services.IMultiplayerLoggingService.__name__ = true;
cgs.server.services.IMultiplayerLoggingService.prototype = {
	__class__: cgs.server.services.IMultiplayerLoggingService
};
cgs.server.services.IntegrationDataService = function(requestHandler,server,serverTag,version) {
	if(version == null) version = -1;
	cgs.server.services.CgsService.call(this,requestHandler,serverTag,version);
	this._server = server;
};
cgs.server.services.IntegrationDataService.__name__ = true;
cgs.server.services.IntegrationDataService.__super__ = cgs.server.services.CgsService;
cgs.server.services.IntegrationDataService.prototype = $extend(cgs.server.services.CgsService.prototype,{
	checkUserNameAvailable: function(name,userCallback) {
		this._server.checkUserNameAvailable(name,userCallback);
	}
	,__class__: cgs.server.services.IntegrationDataService
});
cgs.server.services.LoggingDataService = function(requestHandler,server,serverTag,version) {
	if(version == null) version = 2;
	cgs.server.services.CgsService.call(this,requestHandler,serverTag,version);
	this._server = server;
};
cgs.server.services.LoggingDataService.__name__ = true;
cgs.server.services.LoggingDataService.__super__ = cgs.server.services.CgsService;
cgs.server.services.LoggingDataService.prototype = $extend(cgs.server.services.CgsService.prototype,{
	requestQuestData: function(dqid,callback) {
		var dataRequest = new cgs.server.logging.requests.QuestDataRequest(this._server,dqid,callback);
		dataRequest.makeRequests(this.getRequestHandler());
	}
	,request: function(method,data,callback) {
		this._server.request(method,callback,null,data);
	}
	,__class__: cgs.server.services.LoggingDataService
});
cgs.server.services.MultiplayerLoggingService = function(cgsServer,requestHandler,serverTag,version) {
	if(version == null) version = 2;
	this._multiplayerSeqId = 0;
	this._currentLocalDqid = 0;
	this._dqidRequestId = 0;
	cgs.server.services.CgsService.call(this,requestHandler,serverTag,version);
	this._server = cgsServer;
	this._users = new Array();
};
cgs.server.services.MultiplayerLoggingService.__name__ = true;
cgs.server.services.MultiplayerLoggingService.__interfaces__ = [cgs.server.services.IMultiplayerLoggingService];
cgs.server.services.MultiplayerLoggingService.__super__ = cgs.server.services.CgsService;
cgs.server.services.MultiplayerLoggingService.prototype = $extend(cgs.server.services.CgsService.prototype,{
	addDqidValidCallback: function(callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		this._server.addDqidCallback(callback,this._currentLocalDqid);
	}
	,isDqidValid: function() {
		return this._currentDqid != null;
	}
	,isRemoteService: function() {
		return false;
	}
	,getDqid: function() {
		return this._currentDqid;
	}
	,getDqidRequestId: function() {
		return this._dqidRequestId;
	}
	,nextMultiplayerSequenceId: function(callback) {
		return ++this._multiplayerSeqId;
	}
	,registerUser: function(user) {
		this._users.push(user);
		user.setMultiplayerService(this);
	}
	,removeUser: function(user) {
		var removeIdx = Lambda.indexOf(this._users,user);
		if(removeIdx >= 0) {
			this._users.splice(removeIdx,1);
			user.setMultiplayerService(null);
		}
	}
	,logAction: function(action,multiUid,callback) {
		this._server.logServerMultiplayerAction(action,this.nextMultiplayerSequenceId(),multiUid,callback);
	}
	,logQuestAction: function(action,multiUid,forceFlush,localDqid) {
		if(localDqid == null) localDqid = -1;
		if(forceFlush == null) forceFlush = false;
		action.addProperty("multi_seqid",this.nextMultiplayerSequenceId());
		action.addProperty("multi_uid",multiUid);
		this._server.logQuestAction(action,localDqid,forceFlush);
	}
	,logQuestStart: function(questId,questHash,details,callback,aeSeqId,localDqid) {
		if(localDqid == null) localDqid = -1;
		var _g = this;
		this._loadingDqid = true;
		this._currentDqid = null;
		this._currentLocalDqid = this._server.logMultiplayerQuestStart(questId,questHash,details,null,this.nextMultiplayerSequenceId(),function(response) {
			var currDqid = _g._server.getDqid(_g._currentLocalDqid);
			if(currDqid == response.getDqid()) {
				_g._currentDqid = currDqid;
				_g._loadingDqid = false;
			}
		},aeSeqId,localDqid);
		this._dqidRequestId = this._server.getDqidRequestId(this._currentLocalDqid);
		return this._currentLocalDqid;
	}
	,logQuestEnd: function(details,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		this._server.logMultiplayerQuestEnd(details,null,this.nextMultiplayerSequenceId(),callback,localDqid);
	}
	,__class__: cgs.server.services.MultiplayerLoggingService
});
cgs.server.utils = {};
cgs.server.utils.INtpTime = function() { };
cgs.server.utils.INtpTime.__name__ = true;
cgs.server.utils.INtpTime.prototype = {
	__class__: cgs.server.utils.INtpTime
};
cgs.server.services.NtpTimeService = function(requestHandler,serverTag) {
	this._serverTime = -1;
	cgs.server.services.RemoteService.call(this,requestHandler,serverTag == cgs.server.CGSServerProps.PRODUCTION_SERVER?cgs.server.services.NtpTimeService.TIME_URL:cgs.server.services.NtpTimeService.DEV_TIME_URL);
	this._timeCallbacks = new Array();
	this.requestTime();
};
cgs.server.services.NtpTimeService.__name__ = true;
cgs.server.services.NtpTimeService.__interfaces__ = [cgs.server.utils.INtpTime];
cgs.server.services.NtpTimeService.__super__ = cgs.server.services.RemoteService;
cgs.server.services.NtpTimeService.prototype = $extend(cgs.server.services.RemoteService.prototype,{
	getTimeRequestDependency: function() {
		return this._timeRequestDependency;
	}
	,addTimeValidCallback: function(callback) {
		if(this.isTimeValid()) {
			callback();
			return;
		}
		if(this._timeCallbacks == null) this._timeCallbacks = new Array();
		this._timeCallbacks.push(callback);
	}
	,isTimeValid: function() {
		return this._serverTime >= 0;
	}
	,timeRequested: function() {
		return this._requestingTime || this.isTimeValid();
	}
	,getClientTimeStamp: function() {
		if(this._serverTime > 0) return this._serverTime + (this.getTimer() - this._clientTimeOffset); else return this.getTimer();
	}
	,getOffsetClientTimeStamp: function(localTime) {
		return this._serverTime + (localTime - this._clientTimeOffset);
	}
	,requestTime: function() {
		var _g = this;
		var request = new cgs.http.UrlRequest(this.getUrl(),null,function(response) {
			var time = response.getTime();
			_g._requestingTime = false;
			if(time >= 0) {
				var returnTime = _g.getTimer();
				_g._requestDelay = (returnTime - _g._requestedTime) / 2;
				time += _g._requestDelay;
				_g._clientTimeOffset = returnTime;
				_g._serverTime = time;
			}
			_g.handleTimeLoaded();
		});
		request.setResponseStatus(new cgs.server.responses.ServerTimeResponseStatus());
		request.setMaxFailures(3);
		this._requestingTime = true;
		this._requestedTime = this.getTimer();
		var requestId = this.sendRequest(request);
		this._timeRequestDependency = new cgs.http.requests.RequestDependency(requestId,false);
	}
	,getTimer: function() {
		return haxe.Timer.stamp() * 1000;
	}
	,handleTimeLoaded: function() {
		var _g = 0;
		var _g1 = this._timeCallbacks;
		while(_g < _g1.length) {
			var callback = _g1[_g];
			++_g;
			callback();
		}
		this._timeCallbacks = null;
	}
	,__class__: cgs.server.services.NtpTimeService
});
cgs.server.services.RequestService = function(requestHandler,serviceUrl) {
	cgs.server.services.RemoteService.call(this,requestHandler,serviceUrl);
};
cgs.server.services.RequestService.__name__ = true;
cgs.server.services.RequestService.__super__ = cgs.server.services.RemoteService;
cgs.server.services.RequestService.prototype = $extend(cgs.server.services.RemoteService.prototype,{
	genericRequest: function(url,requestData,callback,method) {
		if(method == null) method = "GET";
		var request = new cgs.http.UrlRequest(url,requestData,callback,method);
		this.sendRequest(request);
	}
	,__class__: cgs.server.services.RequestService
});
cgs.server.utils.Timer = function() {
};
cgs.server.utils.Timer.__name__ = true;
cgs.server.utils.Timer.getTimerSeconds = function() {
	return haxe.Timer.stamp();
};
cgs.server.utils.Timer.getTimerMs = function() {
	return haxe.Timer.stamp() * 1000;
};
cgs.server.utils.Timer.prototype = {
	__class__: cgs.server.utils.Timer
};
cgs.teacherportal = {};
cgs.teacherportal.ICopilotLogger = function() { };
cgs.teacherportal.ICopilotLogger.__name__ = true;
cgs.teacherportal.ICopilotLogger.prototype = {
	__class__: cgs.teacherportal.ICopilotLogger
};
cgs.teacherportal.activity = {};
cgs.teacherportal.activity.IActivityLogger = function() { };
cgs.teacherportal.activity.IActivityLogger.__name__ = true;
cgs.teacherportal.activity.IActivityLogger.prototype = {
	__class__: cgs.teacherportal.activity.IActivityLogger
};
cgs.teacherportal.activity.IActivitySequenceIdGenerator = function() { };
cgs.teacherportal.activity.IActivitySequenceIdGenerator.__name__ = true;
cgs.teacherportal.activity.IActivitySequenceIdGenerator.prototype = {
	__class__: cgs.teacherportal.activity.IActivitySequenceIdGenerator
};
cgs.teacherportal.data = {};
cgs.teacherportal.data.QuestPerformance = function(cgsUser,questLogger) {
	this._activePlaytime = 0;
	this._numberMoves = 0;
	this._questLogger = questLogger;
	this._cgsUser = cgsUser;
	this._conceptPerfValues = [];
};
cgs.teacherportal.data.QuestPerformance.__name__ = true;
cgs.teacherportal.data.QuestPerformance.prototype = {
	createMessage: function() {
		var server = this._cgsUser.getServer();
		return server.getMessage();
	}
	,getGameServerData: function() {
		var server = this._cgsUser.getServer();
		return server.getCurrentGameServerData();
	}
	,getQuestLogger: function() {
		return this._questLogger;
	}
	,hasQuestEnded: function() {
		return this._questLogger.hasEnded();
	}
	,setWon: function(value) {
		this._won = value;
	}
	,getWon: function() {
		return this._won;
	}
	,setActivePlaytime: function(time) {
		this._activePlaytime = time;
	}
	,getActivePlaytime: function() {
		return this._activePlaytime;
	}
	,setNumberMoves: function(moves) {
		this._numberMoves = moves;
	}
	,getNumberMoves: function() {
		return this._numberMoves;
	}
	,getStartTime: function() {
		var startTimeMs = this._questLogger.getStartTimeMs();
		var time = startTimeMs / 1000;
		return time | 0;
	}
	,getEndTime: function() {
		var endTimeMs = this._questLogger.getEndTimeMs();
		var time = endTimeMs / 1000;
		return time | 0;
	}
	,addConceptPerformance: function(conceptKey,performance,confidence) {
		this._conceptPerfValues.push({ key : conceptKey, p : performance, c : confidence});
	}
	,getPerformance: function() {
		return this._conceptPerfValues;
	}
	,isDqidValid: function() {
		return this._questLogger.isDqidValid();
	}
	,getDqid: function() {
		return this._questLogger.getDqid();
	}
	,getQuestId: function() {
		return this._questLogger.getQuestId();
	}
	,getDqidRequestId: function() {
		return this._questLogger.getDqidRequestId();
	}
	,addDqidCallback: function(callback) {
		this._questLogger.addDqidCallback(callback);
	}
	,addEndedCallback: function(callback) {
		this._questLogger.addEndedCallback(callback);
	}
	,__class__: cgs.teacherportal.data.QuestPerformance
};
cgs.user.ICgsUser = function() { };
cgs.user.ICgsUser.__name__ = true;
cgs.user.ICgsUser.__interfaces__ = [cgs.teacherportal.ICopilotLogger,cgs.achievement.ICgsAchievementManager,cgs.server.abtesting.ICgsUserAbTester,cgs.cache.ICgsUserCache];
cgs.user.ICgsUser.prototype = {
	__class__: cgs.user.ICgsUser
};
cgs.user.CgsUser = $hx_exports.cgs.user.CgsUser = function(server,cache,abTester,achieveManager) {
	this._server = server;
	this._abTester = abTester;
	this._cache = cache;
	this._achievementManager = achieveManager;
};
cgs.user.CgsUser.__name__ = true;
cgs.user.CgsUser.__interfaces__ = [cgs.user.ICgsUser];
cgs.user.CgsUser.prototype = {
	setLessonId: function(id) {
		this._server.setLessonId(id);
	}
	,getLanguageCode: function() {
		return this._lanCode;
	}
	,initializeAnonymousUser: function(props) {
		var _g = this;
		if(!this.canInitialize()) return;
		this._lanCode = props.getLanguageCode();
		this._defaultUserName = props.getDefaultUsername();
		var userCallback = props.getCompleteCallback();
		this._server.initializeUser(this,props,function(userResponse) {
			_g._initializing = false;
			_g._initialized = !userResponse.failed();
			if(userCallback != null) {
				cgs.logger.Logger.log("Flash: User Initialization Complete");
				userCallback(userResponse);
			}
		});
	}
	,isUserAuthenticated: function(props,callback) {
		this.initAuthUser(props,null,null,null,($_=this._server,$bind($_,$_.isAuthenticated)),callback,[]);
	}
	,initializeAuthenticatedUser: function(props,username,password,callback) {
		this.initAuthUser(props,username,password,null,($_=this._server,$bind($_,$_.authenticateUser)),callback,[]);
	}
	,initializeAuthenticatedStudent: function(props,username,teacherCode,password,gradeLevel,callback) {
		if(gradeLevel == null) gradeLevel = 0;
		this.initAuthUser(props,username,password,teacherCode,($_=this._server,$bind($_,$_.authenticateStudent)),callback,[gradeLevel]);
	}
	,initAuthUser: function(props,username,password,authToken,authFunction,callback,args) {
		if(!this.canInitialize()) return;
		this._lanCode = props.getLanguageCode();
		this._server.setupUserProperties(this,props);
		var fullArgs = [username,password,authToken,authFunction,callback,args];
		$bind(this,this.handleAuthentication).apply(this,fullArgs);
	}
	,registerUser: function(props,username,password,email,callback) {
		var _g = this;
		if(!this.canInitialize()) return;
		this._initializing = true;
		this._server.setupUserProperties(this,props);
		this._server.registerUser(username,password,email,function(userResponse) {
			_g._initializing = false;
			_g._initialized = userResponse.success();
			if(callback != null) callback(userResponse);
		});
	}
	,createAccount: function(username,password,email,callback) {
		var _g = this;
		if(this._username != null) callback(new cgs.server.responses.CgsResponseStatus());
		this._server.createAccount(username,password,email,function(response) {
			if(response.success()) {
				_g._username = username;
				_g._password = password;
			}
			if(callback != null) callback(response);
		});
	}
	,getUidRequestDependency: function() {
		return this._server.getUidRequestDependency();
	}
	,checkUserNameAvailable: function(name,userCallback) {
		this._server.checkUserNameAvailable(name,userCallback);
	}
	,registerStudent: function(props,username,teacherCode,gradeLevel,callback) {
		var _g = this;
		if(!this.canInitialize()) return;
		this._initializing = true;
		this._server.setupUserProperties(this,props);
		this._server.registerStudent(username,teacherCode,gradeLevel,function(userResponse) {
			_g._initializing = false;
			_g._initialized = userResponse.success();
			if(callback != null) callback(userResponse);
		});
	}
	,retryAuthentication: function(username,password,callback) {
		this.handleAuthentication(username,password,null,($_=this._server,$bind($_,$_.authenticateUser)),callback,[]);
	}
	,retryUserRegistration: function(cgsUser,name,password,email,callback) {
		if(!this.canInitialize()) return;
	}
	,retryStudentAuthentication: function(username,teacherCode,password,gradeLevel,callback) {
		if(gradeLevel == null) gradeLevel = 0;
		this.handleAuthentication(username,password,teacherCode,($_=this._server,$bind($_,$_.authenticateStudent)),callback,[gradeLevel]);
	}
	,handleAuthentication: function(username,password,authToken,authFunction,callback,args) {
		var _g = this;
		if(!this.canInitialize()) return;
		this._initializing = true;
		this._username = username;
		this._password = password;
		this._authToken = authToken;
		var localCallback = function(response) {
			_g.handleUserAuth(response,callback);
		};
		if(username == null || password == null && authToken == null) authFunction(localCallback); else if(args.length > 0) {
			var fullArgs = [username,password,authToken];
			var _g1 = 0;
			while(_g1 < args.length) {
				var arg = args[_g1];
				++_g1;
				fullArgs.push(arg);
			}
			fullArgs.push(localCallback);
			authFunction.apply(null,fullArgs);
		} else authFunction(username,password,authToken,localCallback);
	}
	,handleUserAuth: function(userResponse,callback) {
		this._initializing = false;
		this._initialized = userResponse.success();
		var homeplays = userResponse.getHomeplaysResponse();
		if(homeplays != null) this._homeplays = homeplays.getHomeplays();
		if(callback != null) callback(userResponse);
	}
	,canInitialize: function() {
		return !this._initialized && !this._initializing;
	}
	,isValid: function() {
		return true;
	}
	,getServer: function() {
		return this._server;
	}
	,getUserId: function() {
		return this._server.getUid();
	}
	,isUidValid: function() {
		return this._server.isUidValid();
	}
	,getUsername: function() {
		if(this._username == null) return this._defaultUserName; else return this._username;
	}
	,getSessionId: function() {
		return this._server.getSessionId();
	}
	,getConditionId: function() {
		return this._server.getConditionId();
	}
	,setConditionId: function(value) {
		this._server.setConditionId(value);
	}
	,getUserPlayCount: function() {
		return this._server.getUserPlayCount();
	}
	,getUserPreviousPlayCount: function() {
		return this._server.getUserPlayCount() - 1;
	}
	,logMultiplayerQuestStart: function(questId,questHash,details,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		var request = this._server.createMultiplayerQuestStartRequest(questId,questHash,details,null,-1,callback,null,localDqid);
		this.handleQuestDependencies(request);
		request.sendRequest();
		return request.getLocalDqid();
	}
	,logMultiplayerQuestEnd: function(details,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		var request = this._server.createMultiplayerQuestEndRequest(details,null,-1,callback,localDqid);
		this.handleQuestDependencies(request);
		request.sendRequest();
	}
	,handleQuestDependencies: function(request) {
		var multiSeqId = -1;
		var parentDqid = null;
		if(this._multiplayerService != null) {
			multiSeqId = this._multiplayerService.nextMultiplayerSequenceId(function(seqId) {
				multiSeqId = seqId;
				request.setPropertyValue(cgs.server.logging.quests.QuestLogContext.MULTIPLAYER_SEQUENCE_ID_KEY,multiSeqId);
			});
			if(multiSeqId < 0) request.addPropertyDependcy(cgs.server.logging.quests.QuestLogContext.MULTIPLAYER_SEQUENCE_ID_KEY); else request.setPropertyValue(cgs.server.logging.quests.QuestLogContext.MULTIPLAYER_SEQUENCE_ID_KEY,multiSeqId);
			if(this._multiplayerService.isDqidValid()) {
				parentDqid = this._multiplayerService.getDqid();
				request.setPropertyValue(cgs.server.logging.quests.QuestLogContext.PARENT_DQID_KEY,parentDqid);
			} else {
				if(this._multiplayerService.isRemoteService()) request.addPropertyDependcy(cgs.server.logging.quests.QuestLogContext.PARENT_DQID_KEY); else request.addRequestDependencyById(this._multiplayerService.getDqidRequestId(),true);
				this._multiplayerService.addDqidValidCallback(function(dqid) {
					request.setPropertyValue(cgs.server.logging.quests.QuestLogContext.PARENT_DQID_KEY,dqid);
				});
			}
		}
	}
	,createQuestPerformance: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return new cgs.teacherportal.data.QuestPerformance(this,this._server.getQuestLogger(localDqid));
	}
	,logQuestStartWithDqid: function(questId,questHash,dqid,details,localDqid) {
		if(localDqid == null) localDqid = -1;
		return this._server.logQuestStartWithDQID(questId,questHash,dqid,details,null,localDqid);
	}
	,logQuestStart: function(questId,questHash,details,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		return this._server.logQuestStart(questId,questHash,details,callback,null,localDqid);
	}
	,logMultiplayerQuestAction: function(action,localDqid,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDqid == null) localDqid = -1;
		this.localMultiplayerLogQuestAction(action,null,localDqid,forceFlush);
	}
	,logServerMultiplayerQuestAction: function(action,multiUid,localDqid,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDqid == null) localDqid = -1;
		this.localMultiplayerLogQuestAction(action,multiUid,localDqid,forceFlush);
	}
	,localMultiplayerLogQuestAction: function(action,multiUid,localDqid,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDqid == null) localDqid = -1;
		if(multiUid != null) action.setMultiplayerUid(multiUid);
		var actionLog = new cgs.server.logging.actions.QuestActionLogContext(action);
		var multiSeqId = -1;
		if(this._multiplayerService != null) {
			multiSeqId = this._multiplayerService.nextMultiplayerSequenceId(function(seqId) {
				actionLog.setPropertyValue(cgs.server.logging.actions.QuestActionLogContext.MULTIPLAYER_SEQUENCE_ID_KEY,seqId);
			});
			if(multiSeqId < 0) actionLog.addPropertyDependcy(cgs.server.logging.actions.QuestActionLogContext.MULTIPLAYER_SEQUENCE_ID_KEY); else actionLog.setPropertyValue(cgs.server.logging.actions.QuestActionLogContext.MULTIPLAYER_SEQUENCE_ID_KEY,multiSeqId);
		}
		this._server.logQuestActionData(actionLog,localDqid,forceFlush);
	}
	,logQuestAction: function(action,localDqid,forceFlush) {
		if(forceFlush == null) forceFlush = false;
		if(localDqid == null) localDqid = -1;
		this._server.logQuestAction(action,localDqid,forceFlush);
	}
	,flushActions: function(localDqid,callback) {
		if(localDqid == null) localDqid = -1;
		this._server.flushActions(localDqid,callback);
	}
	,logQuestScore: function(score,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		this._server.logQuestScore(score,callback,localDqid);
	}
	,logQuestEnd: function(details,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		this._server.logQuestEnd(details,callback,localDqid);
	}
	,logForeignQuestStart: function(dqid,foreignGameId,foreignCategoryId,foreignVersionId,foreignConditionId,details,callback) {
		if(foreignConditionId == null) foreignConditionId = 0;
		this._server.logForeignQuestStart(dqid,foreignGameId,foreignCategoryId,foreignVersionId,foreignConditionId,details,callback);
	}
	,logLinkedQuestStart: function(questId,questHash,linkGameId,linkCategoryId,linkVersionId,linkConditionId,details,callback) {
		if(linkConditionId == null) linkConditionId = 0;
		return this._server.logLinkedQuestStart(questId,questHash,linkGameId,linkCategoryId,linkVersionId,linkConditionId,details,callback);
	}
	,submitFeedback: function(feedback,callback) {
		this._server.submitUserFeedback(feedback,callback);
	}
	,logScore: function(score,questId,callback) {
		this._server.logScore(score,questId,callback);
	}
	,logMultiplayerAction: function(action,callback) {
		var multiSeqId = -1;
		if(this._multiplayerService != null) {
		}
		this._server.logMultiplayerAction(action,multiSeqId,callback);
	}
	,logAction: function(action,callback) {
		this._server.logActionNoQuest(action,callback);
	}
	,startCopilotLogging: function(copilotLogger) {
		this._copilotActivityLogger = copilotLogger;
	}
	,stopCopilotLogger: function() {
		this._copilotActivityLogger = null;
	}
	,logProblemSetStart: function(problemSetId,details,problemCount) {
		if(problemCount == null) problemCount = -1;
		if(this._copilotActivityLogger != null) this._copilotActivityLogger.logProblemSetStart(this,problemSetId,details,problemCount);
	}
	,logProblemSetEnd: function() {
		if(this._copilotActivityLogger != null) this._copilotActivityLogger.logProblemSetEnd(this);
	}
	,logProblemResult: function(result,problemId,conceptKey) {
		if(this._copilotActivityLogger != null) this._copilotActivityLogger.logProblemResult(this,result,problemId,conceptKey);
	}
	,setMultiplayerService: function(service) {
		this._multiplayerService = service;
	}
	,logHomeplayQuestStart: function(questId,questHash,questDetails,homeplayId,homeplayDetails,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		return this._server.logHomeplayQuestStart(questId,questHash,questDetails,homeplayId,homeplayDetails,localDqid,callback);
	}
	,logHomeplayQuestComplete: function(questDetails,homeplayId,homeplayDetails,homeplayCompleted,callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		if(homeplayCompleted == null) homeplayCompleted = false;
		this._server.logHomeplayQuestComplete(questDetails,homeplayId,homeplayDetails,homeplayCompleted,localDqid,callback);
	}
	,retrieveUserAssignments: function() {
		return this._homeplays;
	}
	,isDqidValid: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this._server.isDqidValid(localDqid);
	}
	,getDqid: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this._server.getDqid(localDqid);
	}
	,getQuestId: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		var questId = -1;
		var logger = this._server.getQuestLogger(localDqid);
		if(logger != null) questId = logger.getQuestId();
		return questId;
	}
	,getDqidRequestId: function(localDqid) {
		if(localDqid == null) localDqid = -1;
		return this._server.getDqidRequestId(localDqid);
	}
	,addDqidCallback: function(callback,localDqid) {
		if(localDqid == null) localDqid = -1;
		this._server.addDqidCallback(callback,localDqid);
	}
	,isTosRequired: function() {
		return this._server.userTosRequired();
	}
	,getTosStatus: function() {
		return this._server.getUserTosStatus();
	}
	,updateTosStatus: function(status,callback) {
		this._server.updateUserTosStatus(status,callback);
	}
	,registerDefaultValue: function(varName,value,valueType) {
		if(this._abTester == null) return;
		this._abTester.registerDefaultValue(varName,value,valueType);
	}
	,getVariableValue: function(varName) {
		if(this._abTester == null) return null;
		return this._abTester.getVariableValue(varName);
	}
	,overrideVariableValue: function(varName,value) {
		if(this._abTester == null) return;
		this._abTester.overrideVariableValue(varName,value);
	}
	,variableTested: function(varName,results) {
		if(this._abTester == null) return;
		this._abTester.variableTested(varName,results);
	}
	,startVariableTesting: function(varName,startData) {
		if(this._abTester == null) return;
		this._abTester.startVariableTesting(varName,startData);
	}
	,endVariableTesting: function(varName,results) {
		if(this._abTester == null) return;
		this._abTester.endVariableTesting(varName,results);
	}
	,startTimedVariableTesting: function(varName,startData) {
		if(this._abTester == null) return;
		this._abTester.startTimedVariableTesting(varName,startData);
	}
	,getUserConditionId: function() {
		if(this._abTester == null) return -1;
		return this._abTester.getUserConditionId();
	}
	,setDefaultVariableProvider: function(value) {
		if(this._abTester == null) return;
		this._abTester.setDefaultVariableProvider(value);
	}
	,size: function() {
		if(this._cache == null) return 0;
		return this._cache.getSize();
	}
	,clearCache: function() {
		if(this._cache == null) return;
		this._cache.clearCache(this.getUserId());
	}
	,deleteSave: function(property) {
		if(this._cache == null) return;
		this._cache.deleteSave(property,this.getUserId());
	}
	,flush: function(callback) {
		if(this._cache == null) return false;
		return this._cache.flush(this.getUserId(),callback);
	}
	,registerSaveCallback: function(property,callback) {
		if(this._cache == null) return;
		this._cache.registerSaveCallback(property,callback);
	}
	,unregisterSaveCallback: function(property) {
		if(this._cache == null) return;
		this._cache.unregisterSaveCallback(property);
	}
	,getSave: function(property) {
		if(this._cache == null) return null;
		return this._cache.getSave(property,this.getUserId());
	}
	,initSave: function(property,defaultVal,flush) {
		if(flush == null) flush = true;
		if(this._cache == null) return;
		this._cache.initSave(property,defaultVal,this.getUserId(),flush);
	}
	,saveExists: function(property) {
		if(this._cache == null) return false;
		return this._cache.saveExists(property,this.getUserId());
	}
	,setSave: function(property,val,flush) {
		if(flush == null) flush = true;
		if(this._cache == null) return false;
		return this._cache.setSave(property,val,this.getUserId(),flush);
	}
	,setGameQuestId: function(value) {
	}
	,initAchievement: function(achievement,startStatus) {
		if(startStatus == null) startStatus = false;
		var result = false;
		if(this._achievementManager != null) result = this._achievementManager.initAchievement(achievement,startStatus);
		return result;
	}
	,getAchievementStatus: function(achievement) {
		var result = false;
		if(this._achievementManager != null) result = this._achievementManager.getAchievementStatus(achievement);
		return result;
	}
	,setAchievementStatus: function(achievement,status) {
		var result = false;
		if(this._achievementManager != null) result = this._achievementManager.setAchievementStatus(achievement,status);
		return result;
	}
	,achievementExists: function(achievement) {
		var result = false;
		if(this._achievementManager != null) result = this._achievementManager.achievementExists(achievement);
		return result;
	}
	,flushServerRequests: function() {
		var hasRequests = false;
		if(this._cache != null) {
			hasRequests = this._cache.hasUnsavedServerData(this.getUserId());
			this._cache.flushForAll();
		}
		if(this._server.hasPendingLogs()) {
		}
		return hasRequests;
	}
	,__class__: cgs.user.CgsUser
};
cgs.user.ICgsUserManager = function() { };
cgs.user.ICgsUserManager.__name__ = true;
cgs.user.ICgsUserManager.prototype = {
	__class__: cgs.user.ICgsUserManager
};
cgs.user.CgsUserManager = function() {
	this.m_users = new Array();
};
cgs.user.CgsUserManager.__name__ = true;
cgs.user.CgsUserManager.__interfaces__ = [cgs.user.ICgsUserManager];
cgs.user.CgsUserManager.prototype = {
	getNumUsers: function() {
		return this.m_users.length;
	}
	,getUserList: function() {
		return this.m_users.slice();
	}
	,getUserIdArray: function() {
		var result = new Array();
		var _g = 0;
		var _g1 = this.m_users;
		while(_g < _g1.length) {
			var user = _g1[_g];
			++_g;
			result.push(user.getUserId());
		}
		return result;
	}
	,getUserIdList: function() {
		var result = new Array();
		var _g = 0;
		var _g1 = this.m_users;
		while(_g < _g1.length) {
			var user = _g1[_g];
			++_g;
			result.push(user.getUserId());
		}
		return result;
	}
	,getUsernameList: function() {
		var result = new Array();
		var _g = 0;
		var _g1 = this.m_users;
		while(_g < _g1.length) {
			var user = _g1[_g];
			++_g;
			result.push(user.getUsername());
		}
		return result;
	}
	,getUsers: function() {
		var result = new haxe.ds.StringMap();
		var _g = 0;
		var _g1 = this.m_users;
		while(_g < _g1.length) {
			var user = _g1[_g];
			++_g;
			var key = user.getUserId();
			result.set(key,user);
		}
		return result;
	}
	,userExistsByUserId: function(userId) {
		var aUser = this.getUserByUserId(userId);
		return aUser != null;
	}
	,userExistsByUsername: function(username) {
		var aUser = this.getUserByUsername(username);
		return aUser != null;
	}
	,addUser: function(user) {
		if(user != null && Lambda.indexOf(this.m_users,user) < 0) this.m_users.push(user);
	}
	,removeUser: function(user) {
		var idx = Lambda.indexOf(this.m_users,user);
		if(user != null && idx >= 0) this.m_users.splice(idx,1);
	}
	,getUserByUserId: function(userId) {
		var result = null;
		var _g = 0;
		var _g1 = this.m_users;
		while(_g < _g1.length) {
			var user = _g1[_g];
			++_g;
			if(userId == user.getUserId()) {
				result = user;
				break;
			}
		}
		return result;
	}
	,getUserByUsername: function(username) {
		var result = null;
		var _g = 0;
		var _g1 = this.m_users;
		while(_g < _g1.length) {
			var user = _g1[_g];
			++_g;
			if(username == user.getUsername()) {
				result = user;
				break;
			}
		}
		return result;
	}
	,__class__: cgs.user.CgsUserManager
};
cgs.user.CgsUserProperties = $hx_exports.cgs.user.CgsUserProperties = function(skey,skeyHashType,gameName,gameID,versionID,categoryID,serverTag,serverVersion) {
	if(serverVersion == null) serverVersion = 2;
	this._serverCacheVersion = 1;
	this._abTestingId = 0;
	this._tosServerVersion = 0;
	this._loadUserHomeplays = false;
	cgs.server.CGSServerProps.call(this,skey,skeyHashType,gameName,gameID,versionID,categoryID,serverTag,serverVersion);
};
cgs.user.CgsUserProperties.__name__ = true;
cgs.user.CgsUserProperties.__super__ = cgs.server.CGSServerProps;
cgs.user.CgsUserProperties.prototype = $extend(cgs.server.CGSServerProps.prototype,{
	setAuthenticateCachedStudent: function(value) {
		this._authStudentCache = value;
	}
	,getAuthenticateCachedStudent: function() {
		return this._authStudentCache;
	}
	,getLoadAbTests: function() {
		return this._loadAbTests;
	}
	,getLoadHomeplays: function() {
		return this._loadUserHomeplays;
	}
	,setLoadHomeplays: function(value) {
		this._loadUserHomeplays = value;
	}
	,getLoadExistingAbTests: function() {
		return this._onlyExistingAbTests;
	}
	,getAbTester: function() {
		return this._abTester;
	}
	,setAbTester: function(value) {
		this._abTester = value;
	}
	,enableCaching: function(saveCacheToServer,cache) {
		if(saveCacheToServer == null) saveCacheToServer = true;
		this._localCaching = true;
		this.setSaveCacheDataToServer(saveCacheToServer);
		this.setCgsCache(cache);
	}
	,enableV2Caching: function(saveCacheToServer,serverCacheKey,cache) {
		if(saveCacheToServer == null) saveCacheToServer = true;
		this._serverCacheVersion = 2;
		this._serverCacheKey = serverCacheKey;
		this.enableCaching(saveCacheToServer,cache);
	}
	,getServerCacheVersion: function() {
		return this._serverCacheVersion;
	}
	,getCacheSaveKey: function() {
		return this._serverCacheKey;
	}
	,setDefaultUsername: function(value) {
		this._defaultUsername = value;
	}
	,getDefaultUsername: function() {
		return this._defaultUsername;
	}
	,enableAbTesting: function(loadExistingOnly,testingId,tester) {
		if(testingId == null) testingId = -1;
		if(loadExistingOnly == null) loadExistingOnly = true;
		this._loadAbTests = true;
		this._onlyExistingAbTests = loadExistingOnly;
		this._abTestingId = testingId;
		this._abTester = tester;
	}
	,enableTosV2: function(tosKey,languageCode) {
		if(languageCode == null) languageCode = "en";
		this.setTosKey(tosKey);
		this._tosServerVersion = 2;
	}
	,getTosKey: function() {
		return this._userTosType;
	}
	,setTosKey: function(value) {
		if(value == null) return;
		var tosKey = value.toLowerCase();
		this._userTosExempt = cgs.server.data.TosData.EXEMPT_TERMS == tosKey;
		this._userTosType = tosKey;
	}
	,getTosExempt: function() {
		return this._userTosExempt;
	}
	,getLanguageCode: function() {
		return this._locale;
	}
	,setLanguageCode: function(value) {
		this._locale = value;
	}
	,getTosServerVersion: function() {
		return this._tosServerVersion;
	}
	,setLessonId: function(id) {
		this._lessonId = id;
	}
	,getLessonId: function() {
		return this._lessonId;
	}
	,__class__: cgs.user.CgsUserProperties
});
var haxe = {};
haxe.io = {};
haxe.io.Bytes = function(length,b) {
	this.length = length;
	this.b = b;
};
haxe.io.Bytes.__name__ = true;
haxe.io.Bytes.alloc = function(length) {
	var a = new Array();
	var _g = 0;
	while(_g < length) {
		var i = _g++;
		a.push(0);
	}
	return new haxe.io.Bytes(length,a);
};
haxe.io.Bytes.ofString = function(s) {
	var a = new Array();
	var i = 0;
	while(i < s.length) {
		var c = StringTools.fastCodeAt(s,i++);
		if(55296 <= c && c <= 56319) c = c - 55232 << 10 | StringTools.fastCodeAt(s,i++) & 1023;
		if(c <= 127) a.push(c); else if(c <= 2047) {
			a.push(192 | c >> 6);
			a.push(128 | c & 63);
		} else if(c <= 65535) {
			a.push(224 | c >> 12);
			a.push(128 | c >> 6 & 63);
			a.push(128 | c & 63);
		} else {
			a.push(240 | c >> 18);
			a.push(128 | c >> 12 & 63);
			a.push(128 | c >> 6 & 63);
			a.push(128 | c & 63);
		}
	}
	return new haxe.io.Bytes(a.length,a);
};
haxe.io.Bytes.prototype = {
	get: function(pos) {
		return this.b[pos];
	}
	,set: function(pos,v) {
		this.b[pos] = v & 255;
	}
	,getString: function(pos,len) {
		if(pos < 0 || len < 0 || pos + len > this.length) throw haxe.io.Error.OutsideBounds;
		var s = "";
		var b = this.b;
		var fcc = String.fromCharCode;
		var i = pos;
		var max = pos + len;
		while(i < max) {
			var c = b[i++];
			if(c < 128) {
				if(c == 0) break;
				s += fcc(c);
			} else if(c < 224) s += fcc((c & 63) << 6 | b[i++] & 127); else if(c < 240) {
				var c2 = b[i++];
				s += fcc((c & 31) << 12 | (c2 & 127) << 6 | b[i++] & 127);
			} else {
				var c21 = b[i++];
				var c3 = b[i++];
				var u = (c & 15) << 18 | (c21 & 127) << 12 | (c3 & 127) << 6 | b[i++] & 127;
				s += fcc((u >> 10) + 55232);
				s += fcc(u & 1023 | 56320);
			}
		}
		return s;
	}
	,toString: function() {
		return this.getString(0,this.length);
	}
	,__class__: haxe.io.Bytes
};
cgs.utils = {};
cgs.utils.Base64 = function() { };
cgs.utils.Base64.__name__ = true;
cgs.utils.Base64.encodeBytesData = function(data,addPadding) {
	if(addPadding == null) addPadding = true;
	var base64 = new haxe.crypto.BaseCode(cgs.utils.Base64.BASE_64_ENCODING_BYTES).encodeBytes(data).toString();
	if(addPadding) {
		var remainder = base64.length % 4;
		while(remainder > 0) {
			base64 += "=";
			--remainder;
		}
	}
	return base64;
};
cgs.utils.Base64.encode = function(data) {
	return cgs.utils.Base64.encodeBytesData(haxe.io.Bytes.ofString(data));
};
cgs.utils.Base64.getTimestamp = function() {
	var timeStamp = haxe.Timer.stamp();
	var b = new haxe.io.BytesOutput();
	b.writeDouble(timeStamp);
	return cgs.utils.Base64.encodeBytesData(b.getBytes(),false);
};
cgs.utils.Capabilities = function() { };
cgs.utils.Capabilities.__name__ = true;
cgs.utils.Capabilities.getOs = function() {
	return "";
};
cgs.utils.Capabilities.getCpuArchitecture = function() {
	return "";
};
cgs.utils.Capabilities.getLanguage = function() {
	return "";
};
cgs.utils.Capabilities.getScreenResolutionX = function() {
	return 0;
};
cgs.utils.Capabilities.getScreenResolutionY = function() {
	return 0;
};
cgs.utils.Capabilities.getScreenDpi = function() {
	return 0;
};
cgs.utils.Capabilities.getPixelAspectRatio = function() {
	return 0;
};
cgs.utils.Capabilities.getVersion = function() {
	return "";
};
cgs.utils.Capabilities.getServerString = function() {
	return "";
};
cgs.utils.Guid = function() { };
cgs.utils.Guid.__name__ = true;
cgs.utils.Guid.create = function() {
	var id1 = new Date().getTime();
	var id2 = Math.random() * Math.POSITIVE_INFINITY;
	var id3 = cgs.utils.Capabilities.getServerString();
	var rawID = cgs.utils.Guid.calculate(id1 + id3 + id2 + cgs.utils.Guid.counter++).toUpperCase();
	var finalString = rawID.substring(0,8) + "-" + rawID.substring(8,12) + "-" + rawID.substring(12,16) + "-" + rawID.substring(16,20) + "-" + rawID.substring(20,32);
	return finalString;
};
cgs.utils.Guid.calculate = function(src) {
	return cgs.utils.Guid.hex_sha1(src);
};
cgs.utils.Guid.hex_sha1 = function(src) {
	return cgs.utils.Guid.binb2hex(cgs.utils.Guid.core_sha1(cgs.utils.Guid.str2binb(src),src.length * 8));
};
cgs.utils.Guid.core_sha1 = function(x,len) {
	x[len >> 5] |= 128 << 24 - len % 32;
	x[(len + 64 >> 9 << 4) + 15] = len;
	var w = [];
	var a = 1732584193;
	var b = -271733879;
	var c = -1732584194;
	var d = 271733878;
	var e = -1009589776;
	var i = 0;
	var j = 0;
	while(i < x.length) {
		var olda = a;
		var oldb = b;
		var oldc = c;
		var oldd = d;
		var olde = e;
		while(j < 80) {
			if(j < 16) w[j] = x[i + j]; else w[j] = cgs.utils.Guid.rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16],1);
			var t = cgs.utils.Guid.safe_add(cgs.utils.Guid.safe_add(cgs.utils.Guid.rol(a,5),cgs.utils.Guid.sha1_ft(j,b,c,d)),cgs.utils.Guid.safe_add(cgs.utils.Guid.safe_add(e,w[j]),cgs.utils.Guid.sha1_kt(j)));
			e = d;
			d = c;
			c = cgs.utils.Guid.rol(b,30);
			b = a;
			a = t;
			++j;
		}
		a = cgs.utils.Guid.safe_add(a,olda);
		b = cgs.utils.Guid.safe_add(b,oldb);
		c = cgs.utils.Guid.safe_add(c,oldc);
		d = cgs.utils.Guid.safe_add(d,oldd);
		e = cgs.utils.Guid.safe_add(e,olde);
		i += 16;
	}
	return [a,b,c,d,e];
};
cgs.utils.Guid.sha1_ft = function(t,b,c,d) {
	if(t < 20) return b & c | ~b & d;
	if(t < 40) return b ^ c ^ d;
	if(t < 60) return b & c | b & d | c & d;
	return b ^ c ^ d;
};
cgs.utils.Guid.sha1_kt = function(t) {
	if(t < 20) return 1518500249; else if(t < 40) return 1859775393; else if(t < 60) return -1894007588; else return -899497514;
};
cgs.utils.Guid.safe_add = function(x,y) {
	var lsw = (x & 65535) + (y & 65535);
	var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	return msw << 16 | lsw & 65535;
};
cgs.utils.Guid.rol = function(num,cnt) {
	return num << cnt | num >>> 32 - cnt;
};
cgs.utils.Guid.str2binb = function(str) {
	var bin = new Array();
	var mask = 255;
	var i = 0;
	var len = str.length * 8;
	while(i < len) {
		bin[i >> 5] |= (HxOverrides.cca(str,i / 8 | 0) & mask) << 24 - i % 32;
		i += 8;
	}
	return bin;
};
cgs.utils.Guid.binb2hex = function(binarray) {
	var str = new String("");
	var tab = new String("0123456789abcdef");
	var i = 0;
	var len = binarray.length * 4;
	while(i < len) {
		str += tab.charAt(binarray[i >> 2] >> (3 - i % 4) * 8 + 4 & 15) + tab.charAt(binarray[i >> 2] >> (3 - i % 4) * 8 & 15);
		++i;
	}
	return str;
};
cgs.utils.Json = function() { };
cgs.utils.Json.__name__ = true;
cgs.utils.Json.decode = function(value) {
	return JSON.parse(value);
};
cgs.utils.Json.encode = function(value) {
	return JSON.stringify(value);
};
cgs.utils.UrlParser = function(url) {
	this.url = url;
	var r = new EReg("^(?:(?![^:@]+:[^:@/]*@)([^:/?#.]+):)?(?://)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:/?#]*)(?::(\\d*))?)(((/(?:[^?#](?![^?#/]*\\.[^?#/.]+(?:[?#]|$)))*/?)?([^?#/]*))(?:\\?([^#]*))?(?:#(.*))?)","");
	r.match(url);
	var _g1 = 0;
	var _g = cgs.utils.UrlParser._parts.length;
	while(_g1 < _g) {
		var i = _g1++;
		Reflect.setField(this,cgs.utils.UrlParser._parts[i],r.matched(i));
	}
};
cgs.utils.UrlParser.__name__ = true;
cgs.utils.UrlParser.parse = function(url) {
	return new cgs.utils.UrlParser(url);
};
cgs.utils.UrlParser.prototype = {
	toString: function() {
		var s = "For Url -> " + this.url + "n";
		var _g1 = 0;
		var _g = cgs.utils.UrlParser._parts.length;
		while(_g1 < _g) {
			var i = _g1++;
			s += cgs.utils.UrlParser._parts[i] + ": " + Std.string(Reflect.field(this,cgs.utils.UrlParser._parts[i])) + (i == cgs.utils.UrlParser._parts.length - 1?"":"n");
		}
		return s;
	}
	,__class__: cgs.utils.UrlParser
};
haxe.Timer = function(time_ms) {
	var me = this;
	this.id = setInterval(function() {
		me.run();
	},time_ms);
};
haxe.Timer.__name__ = true;
haxe.Timer.stamp = function() {
	return new Date().getTime() / 1000;
};
haxe.Timer.prototype = {
	stop: function() {
		if(this.id == null) return;
		clearInterval(this.id);
		this.id = null;
	}
	,run: function() {
	}
	,__class__: haxe.Timer
};
haxe.crypto = {};
haxe.crypto.BaseCode = function(base) {
	var len = base.length;
	var nbits = 1;
	while(len > 1 << nbits) nbits++;
	if(nbits > 8 || len != 1 << nbits) throw "BaseCode : base length must be a power of two.";
	this.base = base;
	this.nbits = nbits;
};
haxe.crypto.BaseCode.__name__ = true;
haxe.crypto.BaseCode.prototype = {
	encodeBytes: function(b) {
		var nbits = this.nbits;
		var base = this.base;
		var size = b.length * 8 / nbits | 0;
		var out = haxe.io.Bytes.alloc(size + (b.length * 8 % nbits == 0?0:1));
		var buf = 0;
		var curbits = 0;
		var mask = (1 << nbits) - 1;
		var pin = 0;
		var pout = 0;
		while(pout < size) {
			while(curbits < nbits) {
				curbits += 8;
				buf <<= 8;
				buf |= b.get(pin++);
			}
			curbits -= nbits;
			out.set(pout++,base.b[buf >> curbits & mask]);
		}
		if(curbits > 0) out.set(pout++,base.b[buf << nbits - curbits & mask]);
		return out;
	}
	,__class__: haxe.crypto.BaseCode
};
haxe.crypto.Md5 = function() {
};
haxe.crypto.Md5.__name__ = true;
haxe.crypto.Md5.encode = function(s) {
	var m = new haxe.crypto.Md5();
	var h = m.doEncode(haxe.crypto.Md5.str2blks(s));
	return m.hex(h);
};
haxe.crypto.Md5.str2blks = function(str) {
	var nblk = (str.length + 8 >> 6) + 1;
	var blks = new Array();
	var blksSize = nblk * 16;
	var _g = 0;
	while(_g < blksSize) {
		var i = _g++;
		blks[i] = 0;
	}
	var i1 = 0;
	while(i1 < str.length) {
		blks[i1 >> 2] |= HxOverrides.cca(str,i1) << (str.length * 8 + i1) % 4 * 8;
		i1++;
	}
	blks[i1 >> 2] |= 128 << (str.length * 8 + i1) % 4 * 8;
	var l = str.length * 8;
	var k = nblk * 16 - 2;
	blks[k] = l & 255;
	blks[k] |= (l >>> 8 & 255) << 8;
	blks[k] |= (l >>> 16 & 255) << 16;
	blks[k] |= (l >>> 24 & 255) << 24;
	return blks;
};
haxe.crypto.Md5.prototype = {
	bitOR: function(a,b) {
		var lsb = a & 1 | b & 1;
		var msb31 = a >>> 1 | b >>> 1;
		return msb31 << 1 | lsb;
	}
	,bitXOR: function(a,b) {
		var lsb = a & 1 ^ b & 1;
		var msb31 = a >>> 1 ^ b >>> 1;
		return msb31 << 1 | lsb;
	}
	,bitAND: function(a,b) {
		var lsb = a & 1 & (b & 1);
		var msb31 = a >>> 1 & b >>> 1;
		return msb31 << 1 | lsb;
	}
	,addme: function(x,y) {
		var lsw = (x & 65535) + (y & 65535);
		var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
		return msw << 16 | lsw & 65535;
	}
	,hex: function(a) {
		var str = "";
		var hex_chr = "0123456789abcdef";
		var _g = 0;
		while(_g < a.length) {
			var num = a[_g];
			++_g;
			var _g1 = 0;
			while(_g1 < 4) {
				var j = _g1++;
				str += hex_chr.charAt(num >> j * 8 + 4 & 15) + hex_chr.charAt(num >> j * 8 & 15);
			}
		}
		return str;
	}
	,rol: function(num,cnt) {
		return num << cnt | num >>> 32 - cnt;
	}
	,cmn: function(q,a,b,x,s,t) {
		return this.addme(this.rol(this.addme(this.addme(a,q),this.addme(x,t)),s),b);
	}
	,ff: function(a,b,c,d,x,s,t) {
		return this.cmn(this.bitOR(this.bitAND(b,c),this.bitAND(~b,d)),a,b,x,s,t);
	}
	,gg: function(a,b,c,d,x,s,t) {
		return this.cmn(this.bitOR(this.bitAND(b,d),this.bitAND(c,~d)),a,b,x,s,t);
	}
	,hh: function(a,b,c,d,x,s,t) {
		return this.cmn(this.bitXOR(this.bitXOR(b,c),d),a,b,x,s,t);
	}
	,ii: function(a,b,c,d,x,s,t) {
		return this.cmn(this.bitXOR(c,this.bitOR(b,~d)),a,b,x,s,t);
	}
	,doEncode: function(x) {
		var a = 1732584193;
		var b = -271733879;
		var c = -1732584194;
		var d = 271733878;
		var step;
		var i = 0;
		while(i < x.length) {
			var olda = a;
			var oldb = b;
			var oldc = c;
			var oldd = d;
			step = 0;
			a = this.ff(a,b,c,d,x[i],7,-680876936);
			d = this.ff(d,a,b,c,x[i + 1],12,-389564586);
			c = this.ff(c,d,a,b,x[i + 2],17,606105819);
			b = this.ff(b,c,d,a,x[i + 3],22,-1044525330);
			a = this.ff(a,b,c,d,x[i + 4],7,-176418897);
			d = this.ff(d,a,b,c,x[i + 5],12,1200080426);
			c = this.ff(c,d,a,b,x[i + 6],17,-1473231341);
			b = this.ff(b,c,d,a,x[i + 7],22,-45705983);
			a = this.ff(a,b,c,d,x[i + 8],7,1770035416);
			d = this.ff(d,a,b,c,x[i + 9],12,-1958414417);
			c = this.ff(c,d,a,b,x[i + 10],17,-42063);
			b = this.ff(b,c,d,a,x[i + 11],22,-1990404162);
			a = this.ff(a,b,c,d,x[i + 12],7,1804603682);
			d = this.ff(d,a,b,c,x[i + 13],12,-40341101);
			c = this.ff(c,d,a,b,x[i + 14],17,-1502002290);
			b = this.ff(b,c,d,a,x[i + 15],22,1236535329);
			a = this.gg(a,b,c,d,x[i + 1],5,-165796510);
			d = this.gg(d,a,b,c,x[i + 6],9,-1069501632);
			c = this.gg(c,d,a,b,x[i + 11],14,643717713);
			b = this.gg(b,c,d,a,x[i],20,-373897302);
			a = this.gg(a,b,c,d,x[i + 5],5,-701558691);
			d = this.gg(d,a,b,c,x[i + 10],9,38016083);
			c = this.gg(c,d,a,b,x[i + 15],14,-660478335);
			b = this.gg(b,c,d,a,x[i + 4],20,-405537848);
			a = this.gg(a,b,c,d,x[i + 9],5,568446438);
			d = this.gg(d,a,b,c,x[i + 14],9,-1019803690);
			c = this.gg(c,d,a,b,x[i + 3],14,-187363961);
			b = this.gg(b,c,d,a,x[i + 8],20,1163531501);
			a = this.gg(a,b,c,d,x[i + 13],5,-1444681467);
			d = this.gg(d,a,b,c,x[i + 2],9,-51403784);
			c = this.gg(c,d,a,b,x[i + 7],14,1735328473);
			b = this.gg(b,c,d,a,x[i + 12],20,-1926607734);
			a = this.hh(a,b,c,d,x[i + 5],4,-378558);
			d = this.hh(d,a,b,c,x[i + 8],11,-2022574463);
			c = this.hh(c,d,a,b,x[i + 11],16,1839030562);
			b = this.hh(b,c,d,a,x[i + 14],23,-35309556);
			a = this.hh(a,b,c,d,x[i + 1],4,-1530992060);
			d = this.hh(d,a,b,c,x[i + 4],11,1272893353);
			c = this.hh(c,d,a,b,x[i + 7],16,-155497632);
			b = this.hh(b,c,d,a,x[i + 10],23,-1094730640);
			a = this.hh(a,b,c,d,x[i + 13],4,681279174);
			d = this.hh(d,a,b,c,x[i],11,-358537222);
			c = this.hh(c,d,a,b,x[i + 3],16,-722521979);
			b = this.hh(b,c,d,a,x[i + 6],23,76029189);
			a = this.hh(a,b,c,d,x[i + 9],4,-640364487);
			d = this.hh(d,a,b,c,x[i + 12],11,-421815835);
			c = this.hh(c,d,a,b,x[i + 15],16,530742520);
			b = this.hh(b,c,d,a,x[i + 2],23,-995338651);
			a = this.ii(a,b,c,d,x[i],6,-198630844);
			d = this.ii(d,a,b,c,x[i + 7],10,1126891415);
			c = this.ii(c,d,a,b,x[i + 14],15,-1416354905);
			b = this.ii(b,c,d,a,x[i + 5],21,-57434055);
			a = this.ii(a,b,c,d,x[i + 12],6,1700485571);
			d = this.ii(d,a,b,c,x[i + 3],10,-1894986606);
			c = this.ii(c,d,a,b,x[i + 10],15,-1051523);
			b = this.ii(b,c,d,a,x[i + 1],21,-2054922799);
			a = this.ii(a,b,c,d,x[i + 8],6,1873313359);
			d = this.ii(d,a,b,c,x[i + 15],10,-30611744);
			c = this.ii(c,d,a,b,x[i + 6],15,-1560198380);
			b = this.ii(b,c,d,a,x[i + 13],21,1309151649);
			a = this.ii(a,b,c,d,x[i + 4],6,-145523070);
			d = this.ii(d,a,b,c,x[i + 11],10,-1120210379);
			c = this.ii(c,d,a,b,x[i + 2],15,718787259);
			b = this.ii(b,c,d,a,x[i + 9],21,-343485551);
			a = this.addme(a,olda);
			b = this.addme(b,oldb);
			c = this.addme(c,oldc);
			d = this.addme(d,oldd);
			i += 16;
		}
		return [a,b,c,d];
	}
	,__class__: haxe.crypto.Md5
};
haxe.ds = {};
haxe.ds.IntMap = function() {
	this.h = { };
};
haxe.ds.IntMap.__name__ = true;
haxe.ds.IntMap.__interfaces__ = [IMap];
haxe.ds.IntMap.prototype = {
	set: function(key,value) {
		this.h[key] = value;
	}
	,get: function(key) {
		return this.h[key];
	}
	,exists: function(key) {
		return this.h.hasOwnProperty(key);
	}
	,remove: function(key) {
		if(!this.h.hasOwnProperty(key)) return false;
		delete(this.h[key]);
		return true;
	}
	,keys: function() {
		var a = [];
		for( var key in this.h ) {
		if(this.h.hasOwnProperty(key)) a.push(key | 0);
		}
		return HxOverrides.iter(a);
	}
	,iterator: function() {
		return { ref : this.h, it : this.keys(), hasNext : function() {
			return this.it.hasNext();
		}, next : function() {
			var i = this.it.next();
			return this.ref[i];
		}};
	}
	,__class__: haxe.ds.IntMap
};
haxe.ds.ObjectMap = function() {
	this.h = { };
	this.h.__keys__ = { };
};
haxe.ds.ObjectMap.__name__ = true;
haxe.ds.ObjectMap.__interfaces__ = [IMap];
haxe.ds.ObjectMap.prototype = {
	set: function(key,value) {
		var id = key.__id__ || (key.__id__ = ++haxe.ds.ObjectMap.count);
		this.h[id] = value;
		this.h.__keys__[id] = key;
	}
	,remove: function(key) {
		var id = key.__id__;
		if(this.h.__keys__[id] == null) return false;
		delete(this.h[id]);
		delete(this.h.__keys__[id]);
		return true;
	}
	,keys: function() {
		var a = [];
		for( var key in this.h.__keys__ ) {
		if(this.h.hasOwnProperty(key)) a.push(this.h.__keys__[key]);
		}
		return HxOverrides.iter(a);
	}
	,__class__: haxe.ds.ObjectMap
};
haxe.ds.StringMap = function() {
	this.h = { };
};
haxe.ds.StringMap.__name__ = true;
haxe.ds.StringMap.__interfaces__ = [IMap];
haxe.ds.StringMap.prototype = {
	set: function(key,value) {
		this.h["$" + key] = value;
	}
	,get: function(key) {
		return this.h["$" + key];
	}
	,exists: function(key) {
		return this.h.hasOwnProperty("$" + key);
	}
	,remove: function(key) {
		key = "$" + key;
		if(!this.h.hasOwnProperty(key)) return false;
		delete(this.h[key]);
		return true;
	}
	,keys: function() {
		var a = [];
		for( var key in this.h ) {
		if(this.h.hasOwnProperty(key)) a.push(key.substr(1));
		}
		return HxOverrides.iter(a);
	}
	,iterator: function() {
		return { ref : this.h, it : this.keys(), hasNext : function() {
			return this.it.hasNext();
		}, next : function() {
			var i = this.it.next();
			return this.ref["$" + i];
		}};
	}
	,__class__: haxe.ds.StringMap
};
haxe.io.BytesBuffer = function() {
	this.b = new Array();
};
haxe.io.BytesBuffer.__name__ = true;
haxe.io.BytesBuffer.prototype = {
	getBytes: function() {
		var bytes = new haxe.io.Bytes(this.b.length,this.b);
		this.b = null;
		return bytes;
	}
	,__class__: haxe.io.BytesBuffer
};
haxe.io.Output = function() { };
haxe.io.Output.__name__ = true;
haxe.io.Output.prototype = {
	writeByte: function(c) {
		throw "Not implemented";
	}
	,writeDouble: function(x) {
		if(x == 0.0) {
			this.writeByte(0);
			this.writeByte(0);
			this.writeByte(0);
			this.writeByte(0);
			this.writeByte(0);
			this.writeByte(0);
			this.writeByte(0);
			this.writeByte(0);
			return;
		}
		var exp = Math.floor(Math.log(Math.abs(x)) / haxe.io.Output.LN2);
		var sig = Math.floor(Math.abs(x) / Math.pow(2,exp) * Math.pow(2,52));
		var sig_h = sig & 34359738367;
		var sig_l = Math.floor(sig / Math.pow(2,32));
		var b8;
		b8 = exp + 1023 >> 4 | (exp > 0?x < 0?128:64:x < 0?128:0);
		var b7 = exp + 1023 << 4 & 255 | sig_l >> 16 & 15;
		var b6 = sig_l >> 8 & 255;
		var b5 = sig_l & 255;
		var b4 = sig_h >> 24 & 255;
		var b3 = sig_h >> 16 & 255;
		var b2 = sig_h >> 8 & 255;
		var b1 = sig_h & 255;
		if(this.bigEndian) {
			this.writeByte(b8);
			this.writeByte(b7);
			this.writeByte(b6);
			this.writeByte(b5);
			this.writeByte(b4);
			this.writeByte(b3);
			this.writeByte(b2);
			this.writeByte(b1);
		} else {
			this.writeByte(b1);
			this.writeByte(b2);
			this.writeByte(b3);
			this.writeByte(b4);
			this.writeByte(b5);
			this.writeByte(b6);
			this.writeByte(b7);
			this.writeByte(b8);
		}
	}
	,__class__: haxe.io.Output
};
haxe.io.BytesOutput = function() {
	this.b = new haxe.io.BytesBuffer();
};
haxe.io.BytesOutput.__name__ = true;
haxe.io.BytesOutput.__super__ = haxe.io.Output;
haxe.io.BytesOutput.prototype = $extend(haxe.io.Output.prototype,{
	writeByte: function(c) {
		this.b.b.push(c);
	}
	,getBytes: function() {
		return this.b.getBytes();
	}
	,__class__: haxe.io.BytesOutput
});
haxe.io.Eof = function() { };
haxe.io.Eof.__name__ = true;
haxe.io.Eof.prototype = {
	toString: function() {
		return "Eof";
	}
	,__class__: haxe.io.Eof
};
haxe.io.Error = { __ename__ : true, __constructs__ : ["Blocked","Overflow","OutsideBounds","Custom"] };
haxe.io.Error.Blocked = ["Blocked",0];
haxe.io.Error.Blocked.__enum__ = haxe.io.Error;
haxe.io.Error.Overflow = ["Overflow",1];
haxe.io.Error.Overflow.__enum__ = haxe.io.Error;
haxe.io.Error.OutsideBounds = ["OutsideBounds",2];
haxe.io.Error.OutsideBounds.__enum__ = haxe.io.Error;
haxe.io.Error.Custom = function(e) { var $x = ["Custom",3,e]; $x.__enum__ = haxe.io.Error; return $x; };
var js = {};
js.Boot = function() { };
js.Boot.__name__ = true;
js.Boot.getClass = function(o) {
	if((o instanceof Array) && o.__enum__ == null) return Array; else return o.__class__;
};
js.Boot.__string_rec = function(o,s) {
	if(o == null) return "null";
	if(s.length >= 5) return "<...>";
	var t = typeof(o);
	if(t == "function" && (o.__name__ || o.__ename__)) t = "object";
	switch(t) {
	case "object":
		if(o instanceof Array) {
			if(o.__enum__) {
				if(o.length == 2) return o[0];
				var str = o[0] + "(";
				s += "\t";
				var _g1 = 2;
				var _g = o.length;
				while(_g1 < _g) {
					var i = _g1++;
					if(i != 2) str += "," + js.Boot.__string_rec(o[i],s); else str += js.Boot.__string_rec(o[i],s);
				}
				return str + ")";
			}
			var l = o.length;
			var i1;
			var str1 = "[";
			s += "\t";
			var _g2 = 0;
			while(_g2 < l) {
				var i2 = _g2++;
				str1 += (i2 > 0?",":"") + js.Boot.__string_rec(o[i2],s);
			}
			str1 += "]";
			return str1;
		}
		var tostr;
		try {
			tostr = o.toString;
		} catch( e ) {
			return "???";
		}
		if(tostr != null && tostr != Object.toString) {
			var s2 = o.toString();
			if(s2 != "[object Object]") return s2;
		}
		var k = null;
		var str2 = "{\n";
		s += "\t";
		var hasp = o.hasOwnProperty != null;
		for( var k in o ) {
		if(hasp && !o.hasOwnProperty(k)) {
			continue;
		}
		if(k == "prototype" || k == "__class__" || k == "__super__" || k == "__interfaces__" || k == "__properties__") {
			continue;
		}
		if(str2.length != 2) str2 += ", \n";
		str2 += s + k + " : " + js.Boot.__string_rec(o[k],s);
		}
		s = s.substring(1);
		str2 += "\n" + s + "}";
		return str2;
	case "function":
		return "<function>";
	case "string":
		return o;
	default:
		return String(o);
	}
};
js.Boot.__interfLoop = function(cc,cl) {
	if(cc == null) return false;
	if(cc == cl) return true;
	var intf = cc.__interfaces__;
	if(intf != null) {
		var _g1 = 0;
		var _g = intf.length;
		while(_g1 < _g) {
			var i = _g1++;
			var i1 = intf[i];
			if(i1 == cl || js.Boot.__interfLoop(i1,cl)) return true;
		}
	}
	return js.Boot.__interfLoop(cc.__super__,cl);
};
js.Boot.__instanceof = function(o,cl) {
	if(cl == null) return false;
	switch(cl) {
	case Int:
		return (o|0) === o;
	case Float:
		return typeof(o) == "number";
	case Bool:
		return typeof(o) == "boolean";
	case String:
		return typeof(o) == "string";
	case Array:
		return (o instanceof Array) && o.__enum__ == null;
	case Dynamic:
		return true;
	default:
		if(o != null) {
			if(typeof(cl) == "function") {
				if(o instanceof cl) return true;
				if(js.Boot.__interfLoop(js.Boot.getClass(o),cl)) return true;
			}
		} else return false;
		if(cl == Class && o.__name__ != null) return true;
		if(cl == Enum && o.__ename__ != null) return true;
		return o.__enum__ == cl;
	}
};
js.Boot.__cast = function(o,t) {
	if(js.Boot.__instanceof(o,t)) return o; else throw "Cannot cast " + Std.string(o) + " to " + Std.string(t);
};
function $iterator(o) { if( o instanceof Array ) return function() { return HxOverrides.iter(o); }; return typeof(o.iterator) == 'function' ? $bind(o,o.iterator) : o.iterator; }
var $_, $fid = 0;
function $bind(o,m) { if( m == null ) return null; if( m.__id__ == null ) m.__id__ = $fid++; var f; if( o.hx__closures__ == null ) o.hx__closures__ = {}; else f = o.hx__closures__[m.__id__]; if( f == null ) { f = function(){ return f.method.apply(f.scope, arguments); }; f.scope = o; f.method = m; o.hx__closures__[m.__id__] = f; } return f; }
if(Array.prototype.indexOf) HxOverrides.indexOf = function(a,o,i) {
	return Array.prototype.indexOf.call(a,o,i);
};
Math.NaN = Number.NaN;
Math.NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
Math.POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
Math.isFinite = function(i) {
	return isFinite(i);
};
Math.isNaN = function(i1) {
	return isNaN(i1);
};
String.prototype.__class__ = String;
String.__name__ = true;
Array.__name__ = true;
Date.prototype.__class__ = Date;
Date.__name__ = ["Date"];
var Int = { __name__ : ["Int"]};
var Dynamic = { __name__ : ["Dynamic"]};
var Float = Number;
Float.__name__ = ["Float"];
var Bool = Boolean;
Bool.__ename__ = ["Bool"];
var Class = { __name__ : ["Class"]};
var Enum = { };
cgs.CgsApiSimple.DEVELOPMENT_RELEASE = "DEV";
cgs.CgsApiSimple.PRODUCTION_RELEASE = "PRD";
cgs.cache.CgsCache.CACHE_NAME_OF_DEFAULT_PLAYER = "defaultPlayerCache";
cgs.cache.CgsCache.CACHE_USER_PREFIX = "cgs.Cache.CGSCache.";
cgs.http.UrlLoaderDataFormat.BINARY = "binary";
cgs.http.UrlLoaderDataFormat.TEXT = "text";
cgs.http.UrlLoaderDataFormat.VARIABLES = "variables";
cgs.http.UrlRequestMethod.DELETE = "DELETE";
cgs.http.UrlRequestMethod.GET = "GET";
cgs.http.UrlRequestMethod.HEAD = "HEAD";
cgs.http.UrlRequestMethod.OPTIONS = "OPTIONS";
cgs.http.UrlRequestMethod.POST = "POST";
cgs.http.UrlRequestMethod.PUT = "PUT";
cgs.server.CGSServerConstants.VERSION_0 = "dev";
cgs.server.CGSServerConstants.VERSION_1 = "ws";
cgs.server.CGSServerConstants.VERSION_2 = "v2";
cgs.server.CGSServerConstants.CURRENT_VERSION = cgs.server.CGSServerConstants.VERSION_2;
cgs.server.CGSServerConstants.CUSTOM_BASE_URL = "prd.ws.centerforgamescience.com";
cgs.server.CGSServerConstants.BASE_URL_DOMAIN = "prd.ws.centerforgamescience.com";
cgs.server.CGSServerConstants.BASE_URL_PATH = "/cgs/apps/games/";
cgs.server.CGSServerConstants.BASE_URL_PHP = "/index.php/";
cgs.server.CGSServerConstants.SCHOOLS_BASE_URL = "schools.centerforgamescience.com";
cgs.server.CGSServerConstants.DEV_URL = "http://dev.ws.centerforgamescience.com/cgs/apps/games/ws/index.php/";
cgs.server.CGSServerConstants.DEV_URL_DOMAIN = "dev.ws.centerforgamescience.com";
cgs.server.CGSServerConstants.STAGING_URL_DOMAIN = "staging.ws.centerforgamescience.com";
cgs.server.CGSServerConstants.INT_DEV_URL_DOMAIN = "dev.integration.centerforgamescience.com";
cgs.server.CGSServerConstants.INT_STAGING_URL_DOMAIN = "staging.integration.centerforgamescience.com";
cgs.server.CGSServerConstants.CUSTOM_INTEGRATION_BASE_URL = "prd.integration.centerforgamescience.com";
cgs.server.CGSServerConstants.INT_BASE_URL_DOMAIN = "prd.integration.centerforgamescience.com";
cgs.server.CGSServerConstants.INT_BASE_URL_PATH = "/cgs/apps/integration/";
cgs.server.CGSServerConstants.INT_BASE_URL_PHP = "/index.php/";
cgs.server.CGSServerConstants.DEFAULT_TIME_URL = "http://prd.integration.centerforgamescience.com/cgs/apps/integration/v2/time.php";
cgs.server.CGSServerConstants.TIME_URL = "http://prd.integration.centerforgamescience.com/cgs/apps/integration/ws/time.php";
cgs.server.CGSServerConstants.TIME_URL_DOMAIN = "prd.integration.centerforgamescience.com";
cgs.server.CGSServerConstants.TIME_URL_PATH = "/cgs/apps/integration/";
cgs.server.CGSServerConstants.TIME_URL_PHP = "/time.php";
cgs.server.CGSServerConstants.TIME_URL_DEV = "http://dev.integration.centerforgamescience.com/cgs/apps/integration/ws/time.php";
cgs.server.CGSServerConstants.DEV_TIME_URL_DOMAIN = "dev.integration.centerforgamescience.com";
cgs.server.CGSServerConstants.TIME_URL_STAGING = "http://staging.integration.centerforgamescience.com/cgs/apps/integration/ws/time.php";
cgs.server.CGSServerConstants.STAGING_TIME_URL_DOMAIN = "staging.integration.centerforgamescience.com";
cgs.server.CGSServerConstants.TIME_URL_LOCAL = "http://localhost:10051/time.php/";
cgs.server.CGSServerConstants.PROXY_URL_PATH = "/cgs/apps/integration/";
cgs.server.CGSServerConstants.PROXY_URL_PHP = "/index.php/proxyinternal/";
cgs.server.CGSServerConstants.LOCAL_PROXY_URL_PATH = "/index.php/proxyinternal/";
cgs.server.CGSServerConstants.LOCAL_URL_PATH = "/index.php/";
cgs.server.CGSServerConstants.LOCAL_URL = "http://localhost:10050/index.php/";
cgs.server.CGSServerConstants.INT_LOCAL_URL = "http://localhost:10051";
cgs.server.CGSServerConstants.UUID_REQUEST = "muser/get/";
cgs.server.CGSServerConstants.DQID_REQUEST = "logging/getdynamicquestid/";
cgs.server.CGSServerConstants.LEGACY_QUEST_START = "loggingassessment/setquest/";
cgs.server.CGSServerConstants.QUEST_START = "quest/start/";
cgs.server.CGSServerConstants.QUEST_END = "quest/end/";
cgs.server.CGSServerConstants.HOMEPLAY_QUEST_START = "quest/homeplaystart/";
cgs.server.CGSServerConstants.HOMEPLAY_QUEST_END = "quest/homeplayend/";
cgs.server.CGSServerConstants.QUEST_ACTIONS = "logging/set/";
cgs.server.CGSServerConstants.CREATE_QUEST = "questcreate/set/";
cgs.server.CGSServerConstants.CREATE_COPILOT_ACTIVITY = "copilot/activitystart";
cgs.server.CGSServerConstants.END_COPILOT_ACTIVITY = "copilot/activityend";
cgs.server.CGSServerConstants.CREATE_COPILOT_PROBLEM_SET = "copilot/problemsetstart";
cgs.server.CGSServerConstants.END_COPILOT_PROBLEM_SET = "copilot/problemsetend";
cgs.server.CGSServerConstants.CREATE_COPILOT_PROBLEM_RESULT = "copilot/problemresult";
cgs.server.CGSServerConstants.USER_FEEDBACK = "loggingprofile/set/";
cgs.server.CGSServerConstants.ACTION_NO_QUEST = "loggingactionnoquest/set/";
cgs.server.CGSServerConstants.PAGELOAD = "loggingpageload/set/";
cgs.server.CGSServerConstants.SAVE_SCORE = "loggingscore/set/";
cgs.server.CGSServerConstants.SCORE_REQUEST = "loggingscore/getscoresbyids/";
cgs.server.CGSServerConstants.TOS_DATA_ID = "tos_status";
cgs.server.CGSServerConstants.SAVE_GAME_DATA = "playerdata/set/";
cgs.server.CGSServerConstants.LOAD_USER_GAME_DATA = "playerdata/getbyuid/";
cgs.server.CGSServerConstants.LOAD_USER_GAME_SERVER_DATA = "playerdata/getbyuser/";
cgs.server.CGSServerConstants.LOAD_GAME_DATA = "playerdata/getbyudataidnuid/";
cgs.server.CGSServerConstants.BATCH_APP_GAME_DATA = "appuserdata/save/";
cgs.server.CGSServerConstants.LOAD_USER_APP_SAVE_DATA_V2 = "appuserdata/load/";
cgs.server.CGSServerConstants.QUESTS_REQUEST = "logging/getquestsbyuserid/";
cgs.server.CGSServerConstants.QUEST_ACTIONS_REQUEST = "logging/getactionsbydynamicquestid/";
cgs.server.CGSServerConstants.PAGE_LOAD_BY_UID_REQUEST = "loggingpageload/getbyuid/";
cgs.server.CGSServerConstants.DEMOGRAPHICS_GET_BY_UID = "loggingprofile/getbyuid/";
cgs.server.CGSServerConstants.LOG_FAILURE = "loggingfailure/set/";
cgs.server.CGSServerConstants.GET_ACTIONS_BY_DQID = "logging/getactionsbydynamicquestid/";
cgs.server.CGSServerConstants.GET_QUESTS_BY_DQID = "logging/getquestsbydynamicquestid/";
cgs.server.CGSServerConstants.GET_QUESTS_BY_CID_TS = "logging/getquestsbycidnts/";
cgs.server.CGSServerConstants.GET_ACTIONS_BY_CID_TS = "logging/getactionsbycidnts/";
cgs.server.CGSServerConstants.GET_QUEST_ACTIONS = "logging/get/";
cgs.server.CGSServerConstants.GET_QUESTS_BY_UID = "logging/getquestsbyuserid/";
cgs.server.CGSServerConstants.GET_NO_QUEST_ACTIONS_BY_UID = "loggingactionnoquest/getbyuid/";
cgs.server.CGSServerConstants.GET_PAGELOADS_BY_UID = "loggingpageload/getbyuid/";
cgs.server.CGSServerConstants.GET_PAGELOADS_BY_CID = "loggingpageload/getbycid/";
cgs.server.CGSServerConstants.GET_PROFILE_BY_UID = "loggingprofile/getbyuid/";
cgs.server.CGSServerConstants.GET_QUEST_STATUS_BY_UID = "loggingqueststatus/getbyuid/";
cgs.server.CGSServerConstants.CHECK_USER_NAME_AVAILABLE = "homeuser/check";
cgs.server.CGSServerConstants.REGISTER_USER = "adminmember/add";
cgs.server.CGSServerConstants.REGISTER_STUDENT = "adminmember/registerstudent/";
cgs.server.CGSServerConstants.ADD_STUDENT = "homegroup/addstudent";
cgs.server.CGSServerConstants.ADD_GROUP = "homegroup/add";
cgs.server.CGSServerConstants.UPDATE_CLASSROOM = "homegroup/update";
cgs.server.CGSServerConstants.ADD_CLASSROOM_STUDENT = "homegroup/addstudent";
cgs.server.CGSServerConstants.CREATE_HOMEPLAY_QUEST = "homequest/add";
cgs.server.CGSServerConstants.CREATE_HOMEPLAY = "homeplay/add";
cgs.server.CGSServerConstants.CREATE_HOMEPLAY_ASSIGNMENT = "homeassignment/add";
cgs.server.CGSServerConstants.UPDATE_HOMEPLAY_ASSIGNMENT = "homeassignment/update";
cgs.server.CGSServerConstants.RETRIEVE_HOMEPLAY_ASSIGNMENTS = "homeassignment/getbyuid";
cgs.server.CGSServerConstants.RETRIEVE_HOMEPLAY_ASSIGNMENTS_FOR_STUDENT = "homeplay/getassignmentsforstudent";
cgs.server.CGSServerConstants.ADD_STUDENT_HOMEPLAY_START = "homeplay/assignmentstart";
cgs.server.CGSServerConstants.ADD_STUDENT_HOMEPLAY_RESULT = "homeplay/assignmentresult";
cgs.server.CGSServerConstants.AUTHENTICATE_USER = "adminmember/authnrmem/";
cgs.server.CGSServerConstants.AUTHENTICATED = "adminmember/authorized/";
cgs.server.CGSServerConstants.AUTHENTICATE_STUDENT = "adminmember/authstudent/";
cgs.server.CGSServerConstants.GET_MEMBER_BY_GROUP_ID = "adminmember/getmembersbygroupidnextsid/";
cgs.server.CGSServerConstants.GET_UID_BY_EXTERNAL_ID = "members/getuidbyexternalid/";
cgs.server.CGSServerConstants.AUTHENTICATE_CACHED_STUDENT = "adminmember/authcachestudent/";
cgs.server.CGSServerConstants.TOS_USER_STATUS = "tos/userstatus/";
cgs.server.CGSServerConstants.TOS_USER_UPDATE = "tos/updateuserstatus/";
cgs.server.CGSServerConstants.TOS_USER_EXEMPT = "tos/exemptuser/";
cgs.server.CGSServerConstants.TOS_REQUEST = "tos/request/";
cgs.server.CGSServerConstants.TOS_USER_STATUS_V2 = "tos/userstatusv2/";
cgs.server.CGSServerConstants.TOS_USER_UPDATE_V2 = "tos/updateuserstatusv2/";
cgs.server.CGSServerConstants.TOS_USER_EXEMPT_V2 = "tos/exemptuserv2/";
cgs.server.CGSServerConstants.bufferFlushIntervalStart = 2000;
cgs.server.CGSServerConstants.bufferFlushIntervalEnd = 5000;
cgs.server.CGSServerConstants.bufferFlushRampTime = 10000;
cgs.server.CGSServerConstants.bufferSizeMin = 1;
cgs.server.CGSServerConstants.bufferFlushForceCount = 50;
cgs.server.CGSServerConstants.serverLatency = 5;
cgs.server.CGSServerProps.DELAYED_DATA_LEVEL = 0;
cgs.server.CGSServerProps.IMMEDIATE_DATA_LEVEL = 1;
cgs.server.CGSServerProps.LOCAL_SERVER = "local";
cgs.server.CGSServerProps.DEV_SERVER = "dev";
cgs.server.CGSServerProps.DEVELOPMENT_SERVER = "dev";
cgs.server.CGSServerProps.STAGING_SERVER = "staging";
cgs.server.CGSServerProps.PRODUCTION_SERVER = "prd";
cgs.server.CGSServerProps.STUDY_SERVER = "school";
cgs.server.CGSServerProps.CUSTOM_SERVER = "custom";
cgs.server.CGSServerProps.VERSION_DEV = 3;
cgs.server.CGSServerProps.VERSION1 = 1;
cgs.server.CGSServerProps.VERSION2 = 2;
cgs.server.CGSServerProps.CURRENT_VERSION = 2;
cgs.server.abtesting.ABTesterConstants.VERSION_0 = "dev";
cgs.server.abtesting.ABTesterConstants.VERSION_1 = "ws";
cgs.server.abtesting.ABTesterConstants.VERSION_2 = "v2";
cgs.server.abtesting.ABTesterConstants.CURRENT_VERSION = cgs.server.abtesting.ABTesterConstants.VERSION_2;
cgs.server.abtesting.ABTesterConstants.CUSTOM_AB_TEST_URL_DOMAIN = "prd.ws.centerforgamescience.com";
cgs.server.abtesting.ABTesterConstants.AB_TEST_URL_LOCAL = "http://localhost:10052/";
cgs.server.abtesting.ABTesterConstants.AB_TEST_URL_DEV = "http://dev.ws.centerforgamescience.com/cgs/apps/abtest/ws/index.php/";
cgs.server.abtesting.ABTesterConstants.DEV_AB_TEST_URL_DOMAIN = "dev.ws.centerforgamescience.com";
cgs.server.abtesting.ABTesterConstants.AB_STAGING_URL = "http://staging.ws.centerforgamescience.com/cgs/apps/abtest/ws/index.php/";
cgs.server.abtesting.ABTesterConstants.STAGING_AB_TEST_URL_DOMAIN = "staging.ws.centerforgamescience.com";
cgs.server.abtesting.ABTesterConstants.AB_TEST_URL = "http://prd.ws.centerforgamescience.com/cgs/apps/abtest/ws/index.php/";
cgs.server.abtesting.ABTesterConstants.AB_TEST_URL_DOMAIN = "prd.ws.centerforgamescience.com";
cgs.server.abtesting.ABTesterConstants.AB_TEST_URL_PATH = "/cgs/apps/abtest/";
cgs.server.abtesting.ABTesterConstants.AB_TEST_URL_PHP = "/index.php/";
cgs.server.abtesting.ABTesterConstants.SCHOOLS_AB_TEST_BASE_URL = "schools.centerforgamescience.com";
cgs.server.abtesting.ABTesterConstants.CREATE_TEST = "abtest/set/";
cgs.server.abtesting.ABTesterConstants.EDIT_TEST = "abtest/edit/";
cgs.server.abtesting.ABTesterConstants.REQUEST_ALL_TESTS = "abtest/request/";
cgs.server.abtesting.ABTesterConstants.REQUEST_TESTS_BY_ID = "abtest/requesttestsbyid/";
cgs.server.abtesting.ABTesterConstants.REQUEST_TEST_STATS = "teststatus/requestteststats/";
cgs.server.abtesting.ABTesterConstants.REQUEST_TEST_CONDITIONS = "abtest/requesttestconditions/";
cgs.server.abtesting.ABTesterConstants.REQUEST_CONDITION_VARIABLES = "abtest/requestconditionvariables/";
cgs.server.abtesting.ABTesterConstants.GET_USER_CONDITIONS = "userconditions/request/";
cgs.server.abtesting.ABTesterConstants.GET_EXISTING_USER_CONDITIONS = "userconditions/requestexisting/";
cgs.server.abtesting.ABTesterConstants.NO_CONDITION_USER = "userconditions/nocondition/";
cgs.server.abtesting.ABTesterConstants.LOG_TEST_START_END = "teststatus/set/";
cgs.server.abtesting.ABTesterConstants.LOG_CONDITION_RESULTS = "conditionresults/set/";
cgs.server.abtesting.ABTesterConstants.REQUEST_TEST_QUEUE_TESTS = "queue/requesttests/";
cgs.server.abtesting.ABTesterConstants.REQUEST_ACTIVE_TEST_QUEUE = "queue/requestactivetests/";
cgs.server.abtesting.ABTesterConstants.DEACTIVATE_TEST = "abtest/deactivate/";
cgs.server.abtesting.ABTesterConstants.STOP_TEST = "abtest/stop";
cgs.server.abtesting.ABTesterConstants.ACTIVATE_TEST = "abtest/activate/";
cgs.server.abtesting.ABTesterConstants.REQUEST_USER_COUNT = "userconditions/usercount/";
cgs.server.abtesting.ABTesterConstants.USERS_CONDITIONS_REQUEST = "userconditions/requestusers/";
cgs.server.abtesting.ABTesterConstants.USERS_TEST_RESULTS_REQUEST = "conditionresults/requestresultsbyuid/";
cgs.server.abtesting.ABTesterConstants.REQUEST_TEST_RESULTS_BY_ID = "testresults/getbyids/";
cgs.server.abtesting.ABTesterConstants.LOAD_TEST_RESULTS = "testresults/load/";
cgs.server.abtesting.ABTesterConstants.RELOAD_TEST_RESULTS = "testresults/reload/";
cgs.server.abtesting.ABTesterConstants.LOAD_USER_RESULTS_DATA = "testresults/retrieve/";
cgs.server.abtesting.ABTesterConstants.LOAD_TEST_RESULTS_STATUS = "testresults/getstatus/";
cgs.server.abtesting.ABTesterConstants.LOAD_TEST_RESULTS_STATUS_BY_IDS = "testresults/getstatusbyids/";
cgs.server.abtesting.ABTesterConstants.CANCEL_TEST_RESULTS = "testresults/cancel/";
cgs.server.abtesting.ABTesterConstants.REQUEST_CUSTOM_RESULTS = "testresults/getcustom/";
cgs.server.abtesting.ABTesterConstants.CREATE_CUSTOM_RESULTS = "testresults/createcustom/";
cgs.server.abtesting.ABTesterConstants.EDIT_CUSTOM_RESULTS = "testresults/editcustom/";
cgs.server.abtesting.ABTesterConstants.DELETE_CUSTOM_RESULTS = "testresults/deletecustom/";
cgs.server.abtesting.UserAbTester.BOOLEAN_VARIABLE = 0;
cgs.server.abtesting.UserAbTester.INTEGER_VARIABLE = 1;
cgs.server.abtesting.UserAbTester.NUMBER_VARIABLE = 2;
cgs.server.abtesting.UserAbTester.STRING_VARIABLE = 3;
cgs.server.abtesting.tests.Variable.BOOLEAN_VARIABLE = 0;
cgs.server.abtesting.tests.Variable.INTEGER_VARIABLE = 1;
cgs.server.abtesting.tests.Variable.NUMBER_VARIABLE = 2;
cgs.server.abtesting.tests.Variable.STRING_VARIABLE = 3;
cgs.server.appdata.UserGameData.supportLegacyData = false;
cgs.server.services.CgsService.LOCAL_SERVER = "local";
cgs.server.services.CgsService.DEVELOPMENT_SERVER = "dev";
cgs.server.services.CgsService.STAGING_SERVER = "staging";
cgs.server.services.CgsService.PRODUCTION_SERVER = "prd";
cgs.server.services.CgsService.URL_VERSION_0 = "dev";
cgs.server.services.CgsService.URL_VERSION_1 = "ws";
cgs.server.services.CgsService.URL_VERSION_2 = "v2";
cgs.server.services.CgsService.URL_CURRENT_VERSION = cgs.server.services.CgsService.URL_VERSION_2;
cgs.server.services.CgsService.VERSION_DEV = 3;
cgs.server.services.CgsService.VERSION1 = 1;
cgs.server.services.CgsService.VERSION2 = 2;
cgs.server.services.CgsService.CURRENT_VERSION = 2;
cgs.server.services.CgsService.VER_2 = 2;
cgs.server.services.CgsService.CURR_VERSION = 2;
cgs.server.services.CgsService.URL_DOMAIN = "prd.integration.centerforgamescience.com";
cgs.server.services.CgsService.URL_PATH = "/cgs/apps/integration/";
cgs.server.services.CgsService.URL_PHP = "/index.php/";
cgs.server.services.CgsService.DEV_URL_DOMAIN = "dev.integration.centerforgamescience.com";
cgs.server.services.CgsService.LOCAL_URL_DOMAIN = "localhost:10051";
cgs.server.challenge.ChallengeService.URL_DOMAIN = "prd.integration.centerforgamescience.com";
cgs.server.challenge.ChallengeService.URL_PATH = "/cgs/apps/integration/";
cgs.server.challenge.ChallengeService.URL_PHP = "/index.php/";
cgs.server.challenge.ChallengeService.DEV_URL_DOMAIN = "dev.integration.centerforgamescience.com";
cgs.server.challenge.ChallengeService.UPDATE_MASTERY = "challenge/updatemastery";
cgs.server.challenge.ChallengeService.SAVE_ACTIVE_TIME = "challenge/saveactivetime";
cgs.server.challenge.ChallengeService.SAVE_EQUATION = "challenge/saveequation";
cgs.server.challenge.ChallengeService.SAVE_EQUATION_WITH_TIME = "challenge/saveequationwtime";
cgs.server.challenge.ChallengeService.SAVE_MASTERY_EQUATION = "challenge/savemasteryequation";
cgs.server.challenge.ChallengeService.REGISTER_MEMBER = "challenge/register";
cgs.server.challenge.ChallengeService.RETRIEVE_DETAILS = "challenge/retrievebyid";
cgs.server.data.TosData.EXEMPT_TERMS = "exempt";
cgs.server.data.TosData.NO_USER_NAME_TOS_40648_TERMS = "40648_nousername";
cgs.server.data.TosData.USER_NAME_TOS_40648_TERMS = "40648_username";
cgs.server.data.TosData.TEACHER_TOS_40648_TERMS = "40648_teacher";
cgs.server.data.TosData.THIRTEEN_OLDER_TOS_41035_TERMS = "41035_13up";
cgs.server.data.TosData.SEVEN_TO_TWELVE_TOS_41035_TERMS = "41035_7to12";
cgs.server.data.TosData.ENGLISH_CODE = "en";
cgs.server.data.UserData.NON_CONSENTED_LOGGING = -1;
cgs.server.data.UserData.NORMAL_LOGGING = 0;
cgs.server.data.UserData.MEMBER_ID_KEY = "mem_id";
cgs.server.data.UserData.ROLE_ID_KEY = "role_id";
cgs.server.data.UserData.UID_KEY = "uid";
cgs.server.data.UserData.FIRST_NAME_KEY = "mem_first_name";
cgs.server.data.UserData.LAST_NAME_KEY = "mem_last_name";
cgs.server.data.UserData.EMAIL_KEY = "mem_email";
cgs.server.data.UserData.LOGGING_TYPE_KEY = "mem_logging_type";
cgs.server.data.UserData.TEACHER = 2;
cgs.server.data.UserData.STUDENT = 3;
cgs.server.data.UserData.GROUP_LEAD = 4;
cgs.server.data.UserData.PARENT = 5;
cgs.server.data.UserTosStatus.EXEMPT_TERMS = "exempt";
cgs.server.logging.GameServerData.NO_SKEY_HASH = 0;
cgs.server.logging.GameServerData.UUID_SKEY_HASH = 1;
cgs.server.logging.GameServerData.DATA_SKEY_HASH = 2;
cgs.server.logging.GameServerData.NO_DATA_ENCODING = 0;
cgs.server.logging.GameServerData.BASE_64_ENCODING = 1;
cgs.server.logging.UserLoggingHandler.MULTIPLAYER_SEQUENCEID_KEY = "multi_seqid";
cgs.server.logging.UserLoggingHandler.MULTIPLAYER_UID_KEY = "multi_uid";
cgs.server.logging.actions.QuestAction.MULTIPLAYER_UID_KEY = "multi_uid";
cgs.server.logging.actions.QuestAction.MULTIPLAYER_SEQUENCEID_KEY = "multi_seqid";
cgs.server.logging.actions.QuestActionLogContext.MULTIPLAYER_SEQUENCE_ID_KEY = "multi_seqid";
cgs.server.logging.messages.UserFeedbackMessage.MALE = "m";
cgs.server.logging.messages.UserFeedbackMessage.FEMALE = "f";
cgs.server.logging.messages.UserFeedbackMessage.NOT_SPECIFIED = "n";
cgs.server.logging.quests.QuestLogContext.PARENT_DQID_KEY = "parent_dqid";
cgs.server.logging.quests.QuestLogContext.MULTIPLAYER_SEQUENCE_ID_KEY = "multi_seqid";
cgs.server.logging.requests.QuestRequest.QUEST_START = "quest/start/";
cgs.server.requests.ServerRequest.LOGGING_URL = 1;
cgs.server.requests.ServerRequest.AB_TESTING_URL = 2;
cgs.server.requests.ServerRequest.GENERAL_URL = 3;
cgs.server.requests.ServerRequest.INTEGRATION_URL = 4;
cgs.server.requests.ServerRequest.GET = "GET";
cgs.server.requests.ServerRequest.POST = "POST";
cgs.server.responses.CgsResponseStatus.USER_REGISTRATION_ERROR_MESSAGE = "add error";
cgs.server.responses.CgsResponseStatus.USER_AUTHENTICATION_ERROR_MESSAGE = "auth error";
cgs.server.responses.CgsResponseStatus.STUDENT_SIGNUP_LOCKED = "signup locked";
cgs.server.responses.CgsResponseStatus.SERVER_RESPONSE_PREFIX = "data=";
cgs.server.responses.CgsResponseStatus.SERVER_RESPONSE_DATA_PREFIX = "&server_data=";
cgs.server.responses.UserDataChunkResponse.SupportLegacyData = false;
cgs.server.services.CgsServerApi.DEFAULT_DATA_KEY = "default";
cgs.server.services.CgsServerApi.LOG_ALL_DATA = 1;
cgs.server.services.CgsServerApi.LOG_PRIORITY_ACTIONS = 2;
cgs.server.services.CgsServerApi.LOG_NO_ACTIONS = 4;
cgs.server.services.CgsServerApi.LOG_NO_DATA = 6;
cgs.server.services.CgsServerApi.LOG_AND_SAVE_NO_DATA = 7;
cgs.server.services.NtpTimeService.TIME_URL = "http://prd.integration.centerforgamescience.com" + "/cgs/apps/integration/v2/time.php";
cgs.server.services.NtpTimeService.DEV_TIME_URL = "http://dev.integration.centerforgamescience.com" + "/cgs/apps/integration/v2/time.php";
cgs.utils.Base64.BASE_64_ENCODING_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
cgs.utils.Base64.BASE_64_ENCODING_BYTES = haxe.io.Bytes.ofString("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
cgs.utils.Base64.BASE_64_PADDING = "=";
cgs.utils.Guid.counter = 0;
cgs.utils.UrlParser._parts = ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"];
haxe.ds.ObjectMap.count = 0;
haxe.io.Output.LN2 = Math.log(2);
cgs.Common.main();
})(typeof window != "undefined" ? window : exports);

//# sourceMappingURL=cgs_common.js.map