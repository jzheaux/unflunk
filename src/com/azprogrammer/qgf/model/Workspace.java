package com.azprogrammer.qgf.model;

import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;

import javax.jdo.annotations.IdGeneratorStrategy;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;
import java.util.Collection;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

/**
 * @author Max Malakhov <malakhovbox@gmail.com>
 * @version 0.1
 * @since 2013-02-28
 */
@PersistenceCapable
public class Workspace {

    @PrimaryKey
    @Persistent(valueStrategy = IdGeneratorStrategy.IDENTITY)
    private Key key;

    @Persistent
    private String user = null;

    @Persistent
    private String sessionId;

    @Persistent
    private String hangoutURL;

    @Persistent
    private String referer;

    @Persistent
    private String userAgent;

    @Persistent
    private Date creationDate;

    @Persistent
    private Set<String> roomList = new HashSet<String>();


    public Workspace(String user) {
        this.user = user;
        this.creationDate = new Date();
    }

    public String getStringKey() {
        return KeyFactory.keyToString(getKey());
    }

    public void addNewRoom(String roomId) {
        roomList.add(roomId);
    }

    public void removeRoom(String roomId) {
        roomList.remove(roomId);
    }

    // getters and setters by default

    public Key getKey() {
        return key;
    }

    public void setKey(Key key) {
        this.key = key;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getHangoutURL() {
        return hangoutURL;
    }

    public void setHangoutURL(String hangoutURL) {
        this.hangoutURL = hangoutURL;
    }

    public String getReferer() {
        return referer;
    }

    public void setReferer(String referer) {
        this.referer = referer;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public Date getCreationDate() {
        return creationDate;
    }

    public void setCreationDate(Date creationDate) {
        this.creationDate = creationDate;
    }

    public Set<String> getRoomList() {
        return roomList;
    }

    public void setRoomList(Set<String> roomList) {
        this.roomList = roomList;
    }
}
