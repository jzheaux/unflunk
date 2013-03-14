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

import com.azprogrammer.qgf.model.WBChannel;
import com.azprogrammer.qgf.model.WBGeometry;
import com.azprogrammer.qgf.model.WBMessage;
import com.azprogrammer.qgf.model.WhiteBoard;
import com.azprogrammer.qgf.text.InputValidator;
import com.azprogrammer.qgf.text.TextFormatter;
import com.google.appengine.api.channel.ChannelMessage;
import com.google.appengine.api.channel.ChannelService;
import com.google.appengine.api.channel.ChannelServiceFactory;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.datastore.Text;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import com.google.appengine.repackaged.org.codehaus.jackson.map.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.propertyeditors.StringTrimmerEditor;
import org.springframework.dao.DataAccessException;
import org.springframework.orm.jdo.JdoTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpSession;
import java.util.*;
import java.util.logging.Logger;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 *
 *
 * @author Max Malakhov <malakhovbox@gmail.com>
 * @since 2013-03-05
 */
@Controller
public class RoomController {

    //how long ago does a user have to have pinged before not being in room anymore?
    private long lastPingMillis = 1000 * 60 * 7;
    private static final char[] validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".toCharArray();
    private static final char[] validDigits = "1234567890".toCharArray();

    private static Logger LOG = Logger.getLogger("RoomController");

    private static final String PARAM_ROOM_ID = "roomId";
    private static final String PARAM_WORKSHEET_ID = "worksheetId";

    private static final String URL_ROOM_ROOT = "/room/{"+PARAM_ROOM_ID+"}";
    private static final String URL_ROOM_PING = URL_ROOM_ROOT + "/ping";
    private static final String URL_ROOM_USERS = URL_ROOM_ROOT + "/users";
    private static final String URL_ROOM_MESSAGE = URL_ROOM_ROOT + "/message";
    private static final String URL_ROOM_WORKSHEET = URL_ROOM_ROOT + "/worksheet/{"+PARAM_WORKSHEET_ID+"}";
    private static final String URL_ROOM_WORKSHEET_NEW = URL_ROOM_ROOT + "/worksheet/new";

    private UserService userService;

    @Autowired
    protected JdoTemplate persistenceManager;
    @Autowired
    protected InputValidator inputValidator;
    @Autowired
    protected TextFormatter textFormatter;

    private ChannelService channelService;

    public RoomController() {
        userService = UserServiceFactory.getUserService();
        channelService = ChannelServiceFactory.getChannelService();
    }

    @InitBinder
    public void initBinder(WebDataBinder binder) {
        binder.registerCustomEditor(String.class, new StringTrimmerEditor(true));
    }

    @RequestMapping(value = URL_ROOM_WORKSHEET, method = RequestMethod.GET)
    public ModelAndView getWorksheetPage(@PathVariable String roomId, @PathVariable String worksheetId) {
        return new ModelAndView("workspace/worksheet")
                .addObject("roomId", roomId)
                .addObject("worksheetId", worksheetId);
    }

    @RequestMapping(value = URL_ROOM_WORKSHEET_NEW, method = RequestMethod.POST, produces = APPLICATION_JSON_VALUE)
    @ResponseBody
    public String createWorksheet(@PathVariable String roomId) {
        String response = null;
        try {
            String worksheetId = "WS_"+generateName(7, validDigits);
            synchronized (this) {
                WhiteBoard room = persistenceManager.getObjectById(WhiteBoard.class, roomId);
                room.addNewWorksheet(worksheetId);
                persistenceManager.makePersistent(room);
            }
            response = "{\"worksheetId\":\""+worksheetId+"\"}";
        } catch (Exception ex) {
            response = "{ \"error\" : \""+ex.getMessage()+"\" }";
        }
        return response;
    }

    @RequestMapping(value = URL_ROOM_PING, method = RequestMethod.GET, produces = APPLICATION_JSON_VALUE)
    @ResponseBody
    public String ping(@PathVariable String roomId, HttpSession session) {

        String response = null;
        try {
            Map<String, Object> model = new HashMap<String, Object>(1);
            synchronized (this) {
                List<WBChannel> channels = getChannels(roomId, session.getId());
                if((channels != null) && (channels.size () > 0)){
                    WBChannel channel = channels.get(0);
                    channel.setTime(System.currentTimeMillis());
                    persistenceManager.makePersistent(channel);
                    model.put ("status", "ok");
                }else{
                    model.put("error","Invalid channel by roomId "+roomId);
                }
            }
            response = new ObjectMapper().writeValueAsString(model);
        } catch (Exception ex) {
            response = "{ \"error\" : \""+ex.getMessage()+"\" }";
        }
        return response;
    }

    @RequestMapping(value = URL_ROOM_USERS, method = RequestMethod.GET, produces = APPLICATION_JSON_VALUE)
    @ResponseBody
    public String getUsers(@PathVariable String roomId, HttpSession session){
        String response = null;
        try {
            Map<String, Object> model = new HashMap<String, Object>(2);
            synchronized (this) {
                List<WBChannel> channels = getLiveChannels(roomId);
                if((channels != null) && (channels.size () > 0)){
                    Set <String> userNames = new HashSet <String> ();
                    for (WBChannel wbChannel : channels) {
                        userNames.add (wbChannel.getUserName ());
                    }
                    model.put("userList", userNames);
                    model.put("status", "ok");
                }else{
                    model.put("error","Invalid channel.");
                }
            }
            response = new ObjectMapper().writeValueAsString(model);
        } catch (Exception ex) {
            response = "{ \"error\" : \""+ex.getMessage()+"\" }";
        }
        return response;
    }

    @RequestMapping(value = URL_ROOM_MESSAGE, method = RequestMethod.POST)//, consumes = APPLICATION_JSON_VALUE)
    @ResponseBody
    public String postMessage(@RequestBody String rawMessage, @PathVariable String roomId, HttpSession session){
        String response = null;
        ObjectMapper jsonMapper = new ObjectMapper();
        try {
            Map<String, Object> model = new HashMap<String, Object>(3);
            synchronized (this) {
                    WBMessage message = jsonMapper.readValue(rawMessage, WBMessage.class);
                    String userName = (String) session.getAttribute("userName");

                    //TODO validate message contents
                    message.setFromUser(userName);

                    if(message.getChatMessage () != null) {
                        message.setChatMessage(inputValidator.cleanCommentText(message.getChatMessage ()));
                        message.setChatMessage(textFormatter.formatCommentText(message.getChatMessage ()));
                    }

                    WhiteBoard room = persistenceManager.getObjectById(WhiteBoard.class, roomId);
                    if(room == null){
                        throw new Exception("Invalid White Board");
                    }

                    message.setWbKey(room.getKey());
                    message.setFromUser(userName);
                    message.setCreationTime(System.currentTimeMillis());

                    //trim any text geom > 100 chars
                    if(message.getGeometry() != null){
                        WBGeometry geom = message.getGeometry();
                        if((geom.getText() != null) && (geom.getText().length() > 100)  ) {
                            geom.setText(geom.getText().substring (0, 99));
                        }
                        if("image".equals(geom.getShapeType()) && geom.getDataStr() != null) {
                            //validate image data
                            geom.setData(new Text(geom.getDataStr ()));
                        }
                    }
                    persistenceManager.makePersistent(message);

                    //don't need data twice on messages sent to channels
                    if((message.getGeometry () != null) && (message.getGeometry ().getData () != null) && (message.getGeometry ().getDataStr () != null)){
                        message.getGeometry ().setData (null);
                    }
                    //List<WBChannel> channels = getLiveChannels(roomId);
                    String channelError = null;
                    //for (WBChannel wbChannel : channels) {
                        // don't need to send drawing data back to originating user
                        //if((message.getChatMessage () != null)) { //|| (!session.getId ().equals (wbChannel.getSessionId ()))){
                            try{
                                channelService.sendMessage(new ChannelMessage(roomId, jsonMapper.writeValueAsString(message) ));

                            }catch(Exception e) {
                                channelError = e.getMessage ();
                            }
                        //}
                    //}
                    //if there was at least one channelError, we'll log it to the browser console
                    if(channelError != null) {
                        model.put ("channelError","error delivering to at least one channel: " + channelError + "(user may have left)");
                    }
                    model.put ("status", "ok");
                    model.put("message", message);
            }
            response = jsonMapper.writeValueAsString(model);
        } catch (Exception ex) {
            response = "{ \"error\" : \""+ex.getMessage()+"\" }";
        }
        return response;
    }

    private List <WBChannel> getChannels(String roomId, String sessionId) {
        List <WBChannel> channels = new ArrayList <WBChannel> ();
        try{
            channels.addAll(persistenceManager.find(
                    WBChannel.class,
                    "this.wbKey == key && this.sessionId == sessId",
                    "com.google.appengine.api.datastore.Key key, String sessId",
                    new Object[] { KeyFactory.stringToKey(roomId), sessionId }));

        } catch(DataAccessException ex) {
            ex.printStackTrace();
        }
        return channels;
    }

    private List <WBChannel> getLiveChannels(String roomId) {
        List <WBChannel> channels = new ArrayList <WBChannel> ();
        try{
            long time = System.currentTimeMillis () - lastPingMillis;

            channels.addAll(persistenceManager.find(
                    WBChannel.class,
                    "this.wbKey == key && this.time > lastPing",
                    "com.google.appengine.api.datastore.Key key, Long lastPing",
                    new Object[] { KeyFactory.stringToKey(roomId), time }));

        } catch(DataAccessException ex) {
            ex.printStackTrace();
        }
        return channels;
    }

    private String generateName(int length, char[] chars) {
        final Random randomGenerator = new Random();
        StringBuilder name = new StringBuilder();

        for(int i = 0; i < length; i ++) {
            name.append(chars[randomGenerator.nextInt(chars.length-1)]);
        }

        return name.toString();
    }
}
