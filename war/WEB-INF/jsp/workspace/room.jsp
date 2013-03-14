
<%--<div dojoType="dijit.layout.ContentPane" style="padding:0;" closable="true" id="${roomId}">--%>
<!-- Room Area -->
<div style="width: 100%; height: 100%;" dojoType="dijit.layout.BorderContainer" design="sidebar" liveSplitters="true" >
<!-- Left Panel -->

<div class="callArea" region="leading" style="width: 30%; height: 100%;" dojoType="dijit.layout.BorderContainer" liveSplitters="true" splitter="true">
    <!-- Call Area -->
    <div region="top"  style="height: 50%;  padding:0;" dojoType="dijit.layout.ContentPane" splitter="true" >
        <div style="width: 100%; height: 100%;  padding:0;" dojoType="dijit.layout.BorderContainer" gutters="false" >
            <div region="center" dojoType="dijit.layout.ContentPane" splitter="true" ondblclick="enterFullScreen()" class="call">
                <div class="card" style="width: 100%; height: 100%;  padding:0;">
                    <div class="local" style="width: 100%; height: 100%;  padding:0;">
                        <video width="100%" height="100%" class="localVideo" autoplay="autoplay" muted="true"/>
                    </div>
                    <div class="remote" style="width: 100%; height: 100%;  padding:0;">
                        <video width="100%" height="100%" class="remoteVideo" autoplay="autoplay">
                        </video>
                        <div class="mini" style="width: 100%; height: 100%;  padding:0;">
                            <video width="100%" height="100%" class="miniVideo" autoplay="autoplay" muted="true"/>
                        </div>
                    </div>
                </div>
            </div>
            <div region="bottom" class="toolbar" style="overflow: auto; width: 37em; padding:0;" dojoType="dijit.layout.ContentPane" >
                <span class="callBtn" dojoType="dijit.form.Button">Call</span><span class="callWaitMessage"></span>
            </div>
        </div>
    </div>
    <!-- Chat Area -->
    <div region="center"  style="width: 40em; height: 50%;  padding:0;" dojoType="dijit.layout.ContentPane" splitter="true" >
        <div class="chatArea" style="width: 100%; height: 100%;  padding:0;" dojoType="dijit.layout.BorderContainer" gutters="false" >

            <div class="output" style="overflow: auto; width: 37em;  padding:0;" region="center" dojoType="dijit.layout.ContentPane" >
            </div>
            <div style="width: 37em; border: 1px solid #888888; padding:0;" region="bottom" dojoType="dijit.layout.ContentPane" >
                <table border="0" cellspacing="5">
                    <tr><td>
                        <%--<textarea dojoType="workspace.BBCodeEditor" cols="40" rows="3" class="chatText"></textarea>--%>

                        <div><span>
                            <button dojoType="dijit.form.Button" showLabel="false" iconClass="dijitEditorIcon dijitEditorIconBold" dojoAttachEvent="onClick: bClick" class="bBtn"></button>
                            <button dojoType="dijit.form.Button" showLabel="false" iconClass="dijitEditorIcon dijitEditorIconItalic" dojoAttachEvent="onClick: iClick" class="iBtn"></button>
                            <button dojoType="dijit.form.Button" showLabel="false" iconClass="dijitEditorIcon dijitEditorIconUnderline" dojoAttachEvent="onClick: uClick" class="uBtn"></button>
                            <button dojoType="dijit.form.Button" showLabel="false" iconClass="dijitEditorIcon dijitEditorIconStrikethrough" dojoAttachEvent="onClick: sClick" class="sBtn"></button>
                            <button dojoType="dijit.form.Button" showLabel="false" iconClass="dijitEditorIcon dijitEditorIconSuperscript" dojoAttachEvent="onClick: supClick" class="supBtn"></button>
                            <button dojoType="dijit.form.Button" showLabel="false" iconClass="dijitEditorIcon dijitEditorIconSubscript" dojoAttachEvent="onClick: subClick" class="subBtn"></button>
                            <button dojoType="dijit.form.Button" showLabel="false" iconClass="dijitEditorIcon dijitEditorIconSelectAll" dojoAttachEvent="onClick: quoteClick" class="quoteBtn"></button>
                            </span>
                            <br>
                            <textarea class="chatText" name="" dojoType="dijit.form.Textarea" rows="3" cols="35" style="min-height: 4em;" dojoAttachPoint="textArea"></textarea>
                        </div>

                        <span class="chatBtn" dojoType="dijit.form.Button">Say</span><span class="chatWaitMessage"></span>
                    </td>
                        <td>
                            Users:<br>
                            <div class="userListDiv"></div>
                        </td>
                    </tr></table>
            </div>
        </div>
    </div>
</div>

<!-- Center Panel -->
<div class="worksheets" region="center" dojoType="dijit.layout.TabContainer" tabPosition="bottom" splitter="true">
    <%--<jsp:include page="worksheet.jsp"/>--%>
</div>

<div region="bottom"  style="height: 10%;" dojoType="dijit.layout.ContentPane" splitter="true" >
    <button class="newWorksheetButton" dojoType="dijit.form.Button" data-dojo-props="iconClass:'dijitIcon dijitIconTask'">New Worksheet</button><br>
    Share this room key with your friends to have them join: <span style="color: #006400; font-weight: bold;">${roomId}</span><br>
    Or send them an email:
    <input dojoType="dijit.form.ValidationTextBox" style="width:20em;" class="email" regExp="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$" maxlength="128" placeHolder="enter an email address"/>
    <button class="sendMailButton" dojoType="dijit.form.Button">send</button>
</div>
</div> <!-- RoomArea -->
<%--</div> <!-- Room1 -->--%>
