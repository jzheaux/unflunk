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

import com.azprogrammer.qgf.model.*;
import com.google.appengine.api.channel.ChannelMessage;
import com.google.appengine.api.channel.ChannelService;
import com.google.appengine.api.channel.ChannelServiceFactory;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import com.google.appengine.repackaged.org.codehaus.jackson.map.ObjectMapper;
import net.sf.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.propertyeditors.StringTrimmerEditor;
import org.springframework.http.HttpStatus;
import org.springframework.orm.jdo.JdoTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.*;
import java.util.logging.Logger;

/**
 *
 *
 * @author Max Malakhov <malakhovbox@gmail.com>
 * @since 2013-02-21
 */
@Controller
public class WorkspaceController {

    //how long ago does a user have to have pinged before not being in room anymore?
    protected long lastPingMillis = 1000 * 60 * 7;
    private static final char[] validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".toCharArray();
    private static final char[] validDigits = "1234567890".toCharArray();

    private static Logger LOG = Logger.getLogger("WorkspaceController");

    private static final String PARAM_WORKSPACE_ID = "workspaceId";
    private static final String PARAM_ROOM_ID = "roomId";

    private static final String URL_WORKSPACE_ROOT = "/workspace";
    private static final String URL_WORKSPACE_LOGIN = URL_WORKSPACE_ROOT + "/login";
    private static final String URL_WORKSPACE_LOGOUT = URL_WORKSPACE_ROOT + "/logout";
    private static final String URL_WORKSPACE_HOME = URL_WORKSPACE_ROOT + "/{"+PARAM_WORKSPACE_ID+"}";
    private static final String URL_WORKSPACE_ROOM = URL_WORKSPACE_HOME + "/room/{"+PARAM_ROOM_ID+"}";
    private static final String URL_WORKSPACE_ROOM_NEW = URL_WORKSPACE_HOME + "/room";

    private UserService userService;

    @Autowired
    protected JdoTemplate persistenceManager;

    private ChannelService channelService;

    public WorkspaceController() {
        userService = UserServiceFactory.getUserService();
        channelService = ChannelServiceFactory.getChannelService();
    }

    @InitBinder
    public void initBinder(WebDataBinder binder) {
        binder.registerCustomEditor(String.class, new StringTrimmerEditor(true));
    }

    @RequestMapping(value = URL_WORKSPACE_LOGIN, method = RequestMethod.GET)
    public String login(@RequestHeader(required = false) String referer,
                              @RequestHeader("User-Agent") String userAgent,
                              HttpSession session) {

        return "workspace/login";
    }

    @RequestMapping(value = URL_WORKSPACE_LOGOUT, method = RequestMethod.POST)
    @ResponseStatus(HttpStatus.OK)
    public void logout(HttpSession session) {

        session.removeAttribute("userName");
    }

    @RequestMapping(value = URL_WORKSPACE_LOGIN, method = RequestMethod.POST, consumes = APPLICATION_JSON_VALUE)
    @ResponseBody
    public String login(@RequestHeader(required = false) String referer,
                              @RequestHeader("User-Agent") String userAgent,
                              @RequestParam String userName,
                              HttpSession session) throws IOException {

        Map<String, Object> model = new HashMap<String, Object>(1);

        String workspaceId = null;
        synchronized (this) {
            try {
                List<Workspace> workspaces = (List<Workspace>) persistenceManager.find(
                        Workspace.class,
                        "this.user == userName",
                        "String userName",
                        new Object[] { userName },
                        "creationDate desc");

                if(workspaces.isEmpty()) {
                    Workspace newWorkspace = new Workspace(userName);
                    persistenceManager.makePersistent(newWorkspace);
                    workspaceId = newWorkspace.getStringKey();
                } else {
                    workspaceId = workspaces.get(0).getStringKey();
                }
                session.setAttribute("userName", userName);
            } catch(Exception ex) {
                model.put("error", ex.getMessage());
            }
        }

        if(workspaceId != null) {
            model.put("workspaceId", workspaceId);
        }

        ObjectMapper mapper = new ObjectMapper();
        String response = mapper.writeValueAsString(model);

        return response;
    }

    @RequestMapping(value = URL_WORKSPACE_HOME, method = RequestMethod.GET)
    public ModelAndView showWorkspacePage(@RequestHeader(required = false) String referer,
                                    @RequestHeader("User-Agent") String userAgent,
                                    @PathVariable String workspaceId,
                                    HttpSession session) throws IOException {

        ModelAndView view = new ModelAndView("workspace/workspace");

        Workspace workspace = null;
        synchronized (this) {
            try {
                workspace = persistenceManager.getObjectById(Workspace.class, workspaceId);

            } catch(Exception ex) {
                view.addObject("error", ex.getMessage());
            }
        }
        if (workspace != null) {
            view.addObject("userName",workspace.getUser());
            view.addObject("workspaceId",workspace.getStringKey());
            view.addObject("roomList",  new ObjectMapper().writeValueAsString(workspace.getRoomList()));
            session.setAttribute("userName", workspace.getUser());
        }

        return view;
    }


    @RequestMapping(value = URL_WORKSPACE_ROOM, method = RequestMethod.GET)
    public ModelAndView getRoomPage(@PathVariable String workspaceId, @PathVariable String roomId) {
        return new ModelAndView("workspace/room", "roomId", roomId);
    }

    @RequestMapping(value = URL_WORKSPACE_ROOM_NEW, method = RequestMethod.POST)
    @ResponseBody
    public String newRoom(@RequestHeader String referer,
                              @RequestHeader("User-Agent") String userAgent,
                              @PathVariable String workspaceId,
                              HttpSession session) throws IOException {

        Map<String, Object> model = new HashMap<String, Object>();
        List<WBMessage> messages = new ArrayList<WBMessage>();
        String roomId;

        synchronized (this) {
            String worksheetId = "WS_"+generateName(7, validDigits);

            WhiteBoard room = new WhiteBoard();
            room.setCreatedBySessionId(session.getId());
            room.setCreationDate(new Date());
            room.setReferer(referer);
            room.setUserAgent(userAgent);
            room.addNewWorksheet(worksheetId);
            persistenceManager.makePersistent(room);

            Workspace workspace = persistenceManager.getObjectById(Workspace.class, workspaceId);
            workspace.addNewRoom(room.getKeyString());
            persistenceManager.makePersistent(workspace);

            persistenceManager.makePersistent(room);

            model.put("messages", messages);
            model.put("worksheets", room.getWorksheetList());

            roomId = KeyFactory.keyToString(room.getKey ());

            Object userNameObj = session.getAttribute("userName");
            String userName = null;
            if (userNameObj != null) {
                userName = userNameObj.toString();
                WBChannel channel = null;
                try {
                    List<WBChannel> channels = (List<WBChannel>) persistenceManager.find(
                            WBChannel.class,
                            "this.wbKey == key && this.sessionId == sessId",
                            "com.google.appengine.api.datastore.Key key, String sessId",
                            new Object[] { room.getKey(), session.getId() } );

                    if ((channels != null) && (channels.size () > 0)){
                        channel = channels.get(0);
                        channel.setTime(System.currentTimeMillis());
                        persistenceManager.makePersistent(channel);
                    }
                } catch(Exception e) {
                    model.put("errorMsg", e.getMessage());
                }
                if(channel == null){
                    channel = new WBChannel();
                    channel.setSessionId(session.getId());
                    channel.setWbKey(room.getKey());
                    channel.setUserName(userName);
                    channel.setTime(System.currentTimeMillis());
                    channel.setUserAgent(userAgent);
                    persistenceManager.makePersistent(channel);
                }
            }
        }
        pushNewUserList(roomId);

        model.put("token", channelService.createChannel(roomId));//session.getId()));
        model.put("roomId", roomId);

        return new ObjectMapper().writeValueAsString(model);
    }

    @RequestMapping(value = URL_WORKSPACE_ROOM, method = RequestMethod.POST)
    @ResponseBody
    public String joinRoom(@RequestHeader String referer,
                          @RequestHeader("User-Agent") String userAgent,
                          @PathVariable String workspaceId,
                          @PathVariable String roomId,
                          HttpSession session) throws IOException {

        Map<String, Object> model = new HashMap<String, Object>();
        List<WBMessage> messages = new ArrayList<WBMessage>();

        synchronized (this) {
            WhiteBoard room = null;
            //roomId = cleanupWbId(roomId);
            try {
                Key key = KeyFactory.stringToKey(roomId);
                room = persistenceManager.getObjectById(WhiteBoard.class, key);

                Workspace workspace = persistenceManager.getObjectById(Workspace.class, workspaceId);
                workspace.addNewRoom(room.getKeyString());
                persistenceManager.makePersistent(workspace);

                messages.addAll(persistenceManager.find(
                        WBMessage.class,
                        "this.wbKey == key",
                        "com.google.appengine.api.datastore.Key key",
                        new Object[] { key },
                        "creationTime asc"));
            } catch(Exception e) {
                model.put("errorMsg", e.getMessage());
            }

            model.put("messages", messages);
            model.put("worksheets", room.getWorksheetList());

            roomId = KeyFactory.keyToString(room.getKey ());

                Object userNameObj = session.getAttribute("userName");
                String userName = null;
                if (userNameObj != null) {
                    userName = userNameObj.toString();
                    WBChannel channel = null;
                    try {
                        List<WBChannel> channels = (List<WBChannel>) persistenceManager.find(
                                WBChannel.class,
                                "this.wbKey == key && this.sessionId == sessId",
                                "com.google.appengine.api.datastore.Key key, String sessId",
                                new Object[] { room.getKey(), session.getId() } );

                        if ((channels != null) && (channels.size () > 0)){
                            channel = channels.get(0);
                            channel.setTime(System.currentTimeMillis());
                            persistenceManager.makePersistent(channel);
                        }
                    } catch(Exception e) {
                        model.put("errorMsg", e.getMessage());
                    }

                    if(channel == null){
                        channel = new WBChannel();
                        channel.setSessionId(session.getId());
                        channel.setWbKey(room.getKey());
                        channel.setUserName(userName);
                        channel.setTime(System.currentTimeMillis());
                        channel.setUserAgent(userAgent);
                        persistenceManager.makePersistent(channel);
                    }
                }
        }
        pushNewUserList(roomId);

        model.put("token", channelService.createChannel(roomId));//session.getId()));
        model.put("roomId", roomId);

        return new ObjectMapper().writeValueAsString(model);
    }

    @RequestMapping(value = URL_WORKSPACE_ROOM, method = RequestMethod.DELETE)
    @ResponseBody
    public String removeRoom(@RequestHeader String referer,
                           @RequestHeader("User-Agent") String userAgent,
                           @PathVariable String workspaceId,
                           @PathVariable String roomId) {

        String response = null;
        try {
            synchronized (this) {
                Workspace workspace = persistenceManager.getObjectById(Workspace.class, workspaceId);
                workspace.removeRoom(roomId);
                persistenceManager.makePersistent(workspace);
            }
            response = "{\"status\":\"ok\"}";
        } catch (Exception ex) {
            response = "{ \"error\" : \""+ex.getMessage()+"\" }";
        }
        return response;
    }

    private String cleanupWbId(String wbId) {
        if(wbId != null && (wbId.indexOf ("'") > -1 || wbId.indexOf ("\"") > -1)) {
            return null;
        }
        return wbId;
    }


    private String generateName(int length, char[] chars) {
        final Random randomGenerator = new Random();
        StringBuilder name = new StringBuilder();

        for(int i = 0; i < length; i ++) {
            name.append(chars[randomGenerator.nextInt(chars.length-1)]);
        }

        return name.toString();
    }

    private void pushNewUserList(String roomId) {
        List <WBChannel> channels = getLiveChannels(roomId);
        HashSet <String> userNames = new HashSet <String> ();
        for (WBChannel wbChannel : channels) {
            userNames.add (wbChannel.getUserName ());
        }
        //for (WBChannel wbChannel : channels) {
            try  {
                WBMessage message = new WBMessage ();
                message.setUserList (userNames);
                channelService.sendMessage(new ChannelMessage(roomId, JSONObject.fromObject(message).toString() ));

            } catch(Exception ex) {
                ex.printStackTrace();
            }
        //}
    }

    protected List <WBChannel> getLiveChannels(String roomId) {
        List <WBChannel> channels = new ArrayList <WBChannel> ();
        try{
            long time = System.currentTimeMillis () - lastPingMillis;

            channels.addAll(persistenceManager.find(
                    WBChannel.class,
                    "this.wbKey == key && this.time > lastPing",
                    "com.google.appengine.api.datastore.Key key, Long lastPing",
                    new Object[] { KeyFactory.stringToKey(roomId), time }));

        } catch(Exception ex) {
            ex.printStackTrace();
        }

        return channels;
    }
}
