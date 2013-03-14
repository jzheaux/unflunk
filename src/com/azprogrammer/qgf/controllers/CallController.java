/*
 * $Id$
 *
 * Copyright ( c ) 2010 Carefx Corporation. All Rights Reserved.
 *
 * This software is the confidential and proprietary information of Carefx
 * Corporation ("Confidential Information").  You shall not disclose such
 * Confidential Information and shall use it only in accordance with the terms
 * of the license agreement you entered into with Carefx Corporation or a Carefx
 * authorized reseller (the "License Agreement"). Carefx may make changes to the
 * Confidential Information from time to time. Such Confidential Information may
 * contain errors.
 *
 * EXCEPT AS EXPLICITLY SET FORTH IN THE LICENSE AGREEMENT, CAREFX DISCLAIMS ALL
 * WARRANTIES, COVENANTS, REPRESENTATIONS, INDEMNITIES, AND GUARANTEES WITH
 * RESPECT TO SOFTWARE AND DOCUMENTATION, WHETHER EXPRESS OR IMPLIED, WRITTEN OR
 * ORAL, STATUTORY OR OTHERWISE INCLUDING, WITHOUT LIMITATION, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY, TITLE, NON-INFRINGEMENT AND FITNESS FOR A
 * PARTICULAR PURPOSE. CAREFX DOES NOT WARRANT THAT END USER'S USE OF THE
 * SOFTWARE WILL BE UNINTERRUPTED, ERROR FREE OR SECURE.
 *
 * CAREFX SHALL NOT BE LIABLE TO END USER, OR ANY OTHER PERSON, CORPORATION OR
 * ENTITY FOR INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY OR CONSEQUENTIAL
 * DAMAGES, OR DAMAGES FOR LOSS OF PROFITS, REVENUE, DATA OR USE, WHETHER IN AN
 * ACTION IN CONTRACT, TORT OR OTHERWISE, EVEN IF CAREFX HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGES. CAREFX' TOTAL LIABILITY TO END USER SHALL NOT
 * EXCEED THE AMOUNTS PAID FOR THE CAREFX SOFTWARE BY END USER DURING THE PRIOR
 * TWELVE (12) MONTHS FROM THE DATE IN WHICH THE CLAIM AROSE.  BECAUSE SOME
 * STATES OR JURISDICTIONS DO NOT ALLOW LIMITATION OR EXCLUSION OF CONSEQUENTIAL
 * OR INCIDENTAL DAMAGES, THE ABOVE LIMITATION MAY NOT APPLY TO END USER.
 *
 * Copyright version 2.0
 */
package com.azprogrammer.qgf.controllers;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import com.azprogrammer.qgf.model.Call;
import com.azprogrammer.qgf.model.CallMessage;
import com.google.appengine.api.channel.ChannelMessage;
import com.google.appengine.api.channel.ChannelService;
import com.google.appengine.api.channel.ChannelServiceFactory;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import net.sf.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.propertyeditors.StringTrimmerEditor;
import org.springframework.http.HttpStatus;
import org.springframework.orm.jdo.JdoTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.util.List;
import java.util.Random;
import java.util.logging.Logger;

/**
 * Serves web requests for operations with Call over P2P.
 *
 * @author Max Malakhov <malakhovbox@gmail.com>
 * @since 2013-02-21
 */
@Controller
public class CallController {

    private static Logger LOG = Logger.getLogger("CallController");

    private static final String PARAM_CALL_ID = "callId";
    private static final String URL_CALL_HOME = "/call";

    private static  final String URL_CALL_NEW = URL_CALL_HOME+"/new";
    private static  final String URL_CALL_MESSAGE = URL_CALL_HOME+"/{"+PARAM_CALL_ID+"}/message";

    private static final String URL_CONNECTED = "/_ah/channel/connected";
    private static final String URL_DISCONNECTED = "/_ah/channel/disconnected";

    private UserService userService;

    @Autowired
    protected JdoTemplate persistenceManager;
    //private PersistenceManager persistenceManager;

    private ChannelService channelService;

    public CallController() {
        userService = UserServiceFactory.getUserService();
        //persistenceManager = PMF.get().getPersistenceManager();
        channelService = ChannelServiceFactory.getChannelService();
    }

    @InitBinder
    public void initBinder(WebDataBinder binder) {
        binder.registerCustomEditor(String.class, new StringTrimmerEditor(true));
    }


    @RequestMapping(value = URL_CALL_HOME, method = RequestMethod.GET)
    public ModelAndView showTestPage(@RequestParam(required = false) String roomKey) {
        return new ModelAndView("call", "roomKey", roomKey);
    }

    @RequestMapping(value = URL_CALL_NEW, method = RequestMethod.GET, produces = APPLICATION_JSON_VALUE)
    @ResponseBody
    public String newCall(@RequestParam(required = false) String callee, @RequestParam(required = false) String roomId,
                       @RequestParam(required = false) String token,
                       @RequestParam(required = false) String ss, @RequestParam(required = false) String ts,
                       @RequestParam(required = false) String tp, @RequestParam(required = false) String compat,
                       @RequestParam(required = false) String debug, @RequestParam(required = false) String hd,
                       HttpServletRequest request, HttpServletResponse response, HttpSession session) {

        String user = (String) session.getAttribute("userName");
        int initiator = 0;
        Call call = null;
        synchronized (this) {
            if ( roomId != null) {
                //room = persistenceManager.getObjectById(Call.class, KeyFactory.stringToKey(roomKey));
                List<Call> calls = (List<Call>) persistenceManager.find(
                        Call.class,
                        "this.roomId == roomId",
                        "String roomId",
                        new Object[] { roomId });
                if (calls != null && !calls.isEmpty()) {
                    call = calls.get(0);
                }
            }
            // New
            if(call == null && !"full".equals(debug)) {
                if(user == null) {
                    user = generateName(10);
                };
                call = new Call();
                call.addUser(user);
                if (!"loopback".equals(debug)) {
                    initiator = 0;
                } else {
                    call.addUser(user); // add the same user
                    initiator = 1;
                }
            // Free
            } else if (call !=null && call.getOccupancy() < 3 &&  !"full".equals(debug)) {
                if(user == null) {
                    user = generateName(10);
                }
                call.addUser(user);
                if (call.getOccupancy() == 1) {
                    initiator = 0;
                } else {
                    initiator = 1;
                }
            // Full
            } else {
                // TODO: Room is full
                LOG.warning("Room "+roomId+" is full");
            }

            call.setRoomId(roomId);
            persistenceManager.makePersistent(call);
        }

        if(compat == null) {
            compat = "TRUE";
        }
        if("loopback".equals(debug)) {
         // set compat to false as DTLS does not work for loopback.
            compat = "FALSE";
        }
        token = createChannel(call, user, 30);
        String params = "{\"token\": \""+token+"\""+
                ",\"me\": \""+user+"\""+
                ",\"callId\": \""+call.getStringKey()+"\""+
                ",\"initiator\": "+initiator+""+  // first user
                ",\"pcConfig\": "+buildPcConfig(ss, ts, tp)+
                ",\"pcConstraints\": "+buildPcConstraints(compat)+
                ",\"offerConstraints\": "+buildOfferConstraints(compat)+
                ",\"mediaConstraints\": "+buildMediaConstraints(hd)+
                ",\"call\": \""+call+"\""+
                "}";

        response.setContentType(APPLICATION_JSON_VALUE);
        return params;
    }

    @RequestMapping(value = URL_CALL_MESSAGE, method = RequestMethod.POST)
    @ResponseStatus(HttpStatus.OK)
    public void message(@RequestBody String message, @PathVariable String callId, @RequestParam String user) {
        StringBuilder log = new StringBuilder();
        synchronized (this) {
            Call call = null;
            try {
                call = persistenceManager.getObjectById(Call.class, KeyFactory.stringToKey(callId));
            } catch (IllegalArgumentException ex) {
                LOG.warning(ex.getMessage());
            }
            log.append("CALL by key "+callId+" found "+call);
            if (call != null) {
                JSONObject jsonObject = JSONObject.fromObject(message);
                String type =(String) jsonObject.get("type");
                if("bye".equalsIgnoreCase(type)) {
                    call.removeUser(user);
                    LOG.info("User " + user + " quit from room " + callId);
                    LOG.info("Call " + callId + " has state " + call);
                }
                String otherUser = call.getOtherUser(user);
                if(otherUser != null && call.hasUser(otherUser)) {
                    if ("offer".equalsIgnoreCase(type)) {
                        // Special case the loopback scenario
                        if(otherUser.equals(user)) {
                            message = message.replace("\"offer\"", "\"answer\"");
                            message = message.replace("a=ice-options:google-ice\\r\\n", "");
                        }
                        //message = maybeAddFakeCrypto(message);
                    }
                    String clientId = makeClientId(call.getKey(), user);
                    //if (room.isConnectedUser(user)) {   // TODO: All of users should be connected
                        channelService.sendMessage(new ChannelMessage(clientId, message));
                        LOG.info("Delivered message to user " + user);
//                    } else {
//                        CallMessage newMessage = new CallMessage();
//                        newMessage.setClientId(clientId);
//                        newMessage.setText(new Text(message));
//                        persistenceManager.makePersistent(newMessage);
//                        LOG.info("Saved message for user " + user);
//                    }
                }
            } else {
                LOG.warning("Unknown call " + callId);
            }
        }
        //return log.toString();
    }

    @RequestMapping(value = URL_CONNECTED, method = RequestMethod.POST)
    public void connect(@RequestParam String from) {
        String roomKey = from.split("/")[0];
        String user = from.split("/")[1];
        synchronized (this) {
            Call room = persistenceManager.getObjectById(Call.class, KeyFactory.stringToKey(roomKey));
            if (room != null && room.hasUser(user)) {
                room.setUserConnected(user);
                persistenceManager.makePersistent(room);

                sendSavedMessages(room.getKey(), user);

                LOG.info("User " + user + " connected to room " + roomKey);
                LOG.info("Room " + roomKey + " has state " + room);
            } else {
                LOG.warning("Unexpected Connect Message to room " + roomKey);
            }
        }

    }

    @RequestMapping(value = URL_DISCONNECTED, method = RequestMethod.POST)
    public void disconnect(@RequestParam String from) {
        String roomKey = from.split("/")[0];
        String user = from.split("/")[1];
        synchronized (this) {
            Call room = persistenceManager.getObjectById(Call.class, KeyFactory.stringToKey(roomKey));
            if (room != null && room.hasUser(user)) {
                // remove user
                deleteSavedMessage(room.getKey(), user);
                room.removeUser(user);
                if(room.getOccupancy() > 0) {
                    persistenceManager.makePersistent(room);
                } else {
                    persistenceManager.deletePersistent(room);
                }
                LOG.info("User " + user + " removed from room " + roomKey);
                LOG.info("Room " + roomKey + " has state " + room);

                // notify other user
                String otherUser = room.getOtherUser(user);
                if(otherUser != null && !otherUser.equals(user)) {
                    channelService.sendMessage(new ChannelMessage(makeClientId(room.getKey(), otherUser), "{\"type\":\"bye\"}" ));
                    LOG.info("Sent BYE to " + otherUser);
                    LOG.warning("User " + user + " disconnected from room " + roomKey);
                }

            }
        }
    }


    private String maybeAddFakeCrypto(String message) {
        if ( message.indexOf("a=crypto") == -1 ) {
            String cryptoLine = "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:BAADBAADBAADBAADBAADBAADBAADBAADBAADBAAD\\r\\n";
            // reverse find for multiple find and insert operations.
            int index = message.indexOf("c=IN", 0);
            while (index != -1) {
                message = message.substring(0, index) + cryptoLine + message.substring(index);
                index = message.indexOf("c=IN", 0);
            }
        }
        return message;
    }

    private String createChannel(Call call, String user, int duration) {
        String clientId = makeClientId(call.getKey(), user);
        return channelService.createChannel(clientId);//, duration);
    }

    private String generateName(int length) {
        final char[] chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".toCharArray(); // 62
        final Random randomGenerator = new Random();
        StringBuilder name = new StringBuilder();

        for(int i = 0; i < length; i ++) {
            name.append(chars[randomGenerator.nextInt(chars.length-1)]);
        }

        return name.toString();
        //return UUID.randomUUID().toString();
    }

    private StringBuffer buildMediaConstraints(String hdVideo) {
        StringBuffer constraints = new StringBuffer("{ \"mandatory\": {");
        // Demo 16:9 video with media constraints.
        if ("true".equals(hdVideo)) {
            // Demo with WHD by setting size with 1280x720.
            constraints.append("\"minHeight\": \"720\"");
            constraints.append("\"minWidth\": \"1280\"");
            // Disabled for now due to weird stretching behavior on Mac.
            //else:
            // Demo with WVGA by setting Aspect Ration;
            //constraints['mandatory']['maxAspectRatio'] = 1.778
            //constraints['mandatory']['minAspectRatio'] = 1.777
        }
        constraints.append("}, \"optional\": [] }");
        return constraints;
    }

    private StringBuffer buildOfferConstraints(String compat) {
        StringBuffer constraints = new StringBuffer("{ \"mandatory\": {");
        // # For interop with FireFox. Disable Data Channel in createOffer.
        if ("TRUE".equals(compat.toUpperCase())) {
            constraints.append("\"MozDontOfferDataChannel\": true ");
        }
        constraints.append("}, \"optional\": [] }");
        return constraints;
    }

    private StringBuffer buildPcConstraints(String compat) {
        StringBuffer constraints = new StringBuffer("{ \"optional\": [");
        if ("TRUE".equals(compat.toUpperCase())) {
            constraints.append("{\"DtlsSrtpKeyAgreement\": true}");
        }
        constraints.append("] }");
        return constraints;
    }

    private StringBuffer buildPcConfig(String stunServer, String turnServer, String tsPwd) {
        StringBuffer servers = new StringBuffer("{\"iceServers\":[");
        if (turnServer != null) {
            servers.append("{\"url\": \"turn:"+turnServer+"\", \"credential\":\""+tsPwd+"\"},");
        }

        if (stunServer != null) {
            servers.append("{\"url\": \"stun:"+stunServer+"\"}");
        } else {
            servers.append("{\"url\": \"stun:stun.l.google.com:19302\"}");
        }
        servers.append("] }");

        return servers;

    }

    private void deleteSavedMessage(Key key, String user) {
        String clientId = makeClientId(key, user);
        for(CallMessage message: findMessageByClientId(clientId)) {
            persistenceManager.deletePersistent(message);
            LOG.info("Deleted the saved message for " + clientId);
        }
    }

    private void sendSavedMessages(Key key, String user) {
        String clientId = makeClientId(key, user);
        for(CallMessage message: findMessageByClientId(clientId)) {
            channelService.sendMessage(new ChannelMessage(clientId, message.getText().getValue() ));
            LOG.info("Delivered saved message to " + clientId);
            persistenceManager.deletePersistent(message);
        }
    }

    private List<CallMessage> findMessageByClientId(String clientId) {
        return (List<CallMessage>) persistenceManager.find(CallMessage.class, "this.clientId == clientId", "String clientId", clientId);

//        Query query = persistenceManager.newQuery(CallMessage.class, "this.clientId == clientId");
//        query.declareParameters("String clientId");
//
//        return (List<CallMessage>) query.execute(clientId);
    }

    private String makeClientId(Key key, String user) {
        //return keyToString(key)+"/"+user;
        return KeyFactory.keyToString(key);//+"/"+user;
    }

    private String keyToString(Key key) {
        String stringKey;
        if (StringUtils.hasText(key.getName())) {
            stringKey = key.getName();
        } else {
            stringKey = String.valueOf(key.getId());
        }
        return stringKey;
    }

}
