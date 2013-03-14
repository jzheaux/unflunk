package com.azprogrammer.qgf.model;

import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;

import javax.jdo.annotations.IdGeneratorStrategy;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

/**
 * @author Max Malakhov <malakhovbox@gmail.com>
 * @version 0.1
 * @since 2013-02-21
 */
@PersistenceCapable
public class Call {

    @PrimaryKey
    @Persistent(valueStrategy = IdGeneratorStrategy.IDENTITY)
    protected Key key;

    @Persistent
    private String roomId = null;

    @Persistent
    private String token = null;

    @Persistent
    private String user1 = null;

    @Persistent
    private String user2 = null;

    @Persistent
    private String guest = null;

    @Persistent
    private boolean user1Connected = false;

    @Persistent
    private boolean user2Connected = false;


    public void addUser(String user) {
        boolean success = true;
        if (!isUser1Exist()) {
            setUser1(user);
        } else if (!isUser2Exist()) {
            setUser2(user);
        } else {
            setGuest(user);
        }
    }

    public void setUserConnected(String user){
        if(isUser1Equal(user)) {
            setUser1Connected(true);
        } else if (isUser2Equal(user)) {
            setUser1Connected(true);
        }
    }

    public boolean hasUser(String user) {
        if(isUser1Equal(user) || isUser2Equal(user)) {
            return true;
        }
        return false;
    }

    public String getOtherUser(String user) {
        String otherUser = null;
        if(isUser1Equal(user)) {
            otherUser = getUser2();
        } else if(isUser2Equal(user)) {
            otherUser = getUser1();
        }
        return otherUser;
    }

    public void removeUser(String user) {
        if(isUser2Equal(user)) {
            removeUser2();
        } else if(isUser1Equal(user)) {
            if (isUser2Exist()) {
                setUser1(getUser2());
                setUser1Connected(isUser2Connected());

                removeUser2();
            } else {
                removeUser1();
            }
        }
    }

    public int getOccupancy() {
        int occupancy = 0;
        if(isUser1Exist()) {
            ++occupancy;
        }
        if(isUser2Exist()) {
            ++occupancy;
        }
        return occupancy;
    }

    public boolean isConnectedUser(String user) {
        boolean connected = false;
        if (isUser1Equal(user)) {
            connected = isUser1Connected();
        }
        if (isUser2Equal(user)) {
            connected = isUser2Connected();
        }
        return connected;
    }

    private boolean isUser1Equal(String user) {
        if (isUser1Exist() && getUser1().equals(user)) {
            return true;
        }
        return false;
    }

    private boolean isUser2Equal(String user) {
        if (isUser2Exist() && getUser2().equals(user)) {
            return true;
        }
        return false;
    }

    private void removeUser1() {
        setUser1(null);
        setUser1Connected(false);
    }

    private void removeUser2() {
        setUser2(null);
        setUser2Connected(false);
    }

    private boolean isUser1Exist() {
        return getUser1() != null && getUser1().length() > 0;
    }

    private boolean isUser2Exist() {
        return getUser2() != null && getUser2().length() > 0;
    }

    // getters and setters
    public String getStringKey() {
        return KeyFactory.keyToString(key);
    }

    public Key getKey() {
        return key;
    }

    public void setKey(Key key) {
        this.key = key;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUser1() {
        return user1;
    }

    public void setUser1(String user1) {
        this.user1 = user1;
    }

    public String getUser2() {
        return user2;
    }

    public void setUser2(String user2) {
        this.user2 = user2;
    }

    public boolean isUser1Connected() {
        return user1Connected;
    }

    public void setUser1Connected(boolean user1Connected) {
        this.user1Connected = user1Connected;
    }

    public boolean isUser2Connected() {
        return user2Connected;
    }

    public void setUser2Connected(boolean user2Connected) {
        this.user2Connected = user2Connected;
    }

    public String getGuest() {
        return guest;
    }

    public void setGuest(String guest) {
        this.guest = guest;
    }

    @Override
    public String toString() {
        return "Call{" +
                "key=" + KeyFactory.keyToString(key)+
                ", roomId='" + roomId + '\'' +
                ", token='" + token + '\'' +
                ", user1='" + user1 + '\'' +
                ", user2='" + user2 + '\'' +
                ", guest='" + guest + '\'' +
                ", user1Connected=" + user1Connected +
                ", user2Connected=" + user2Connected +
                '}';
    }
}
