/**
 * Created with IntelliJ IDEA.
 * User: max
 * Date: 3/3/13
 * Time: 11:41 PM
 * To change this template use File | Settings | File Templates.
 */

var submitUserName = function(){
    //var whiteboard = this;

    var unm = dojo.byId('submitUserNameMessage');
    var unt = dijit.byId('userNameText');
    var unb = dojo.byId('userNameBtn');
    if(!unt.isValid()){
        unm.innerHTML = 'Invalid user name';
    }else{
        unb.setAttribute('disabled',true);
        unt.setAttribute('disabled',true);
        unm.innerHTML = 'sending...';

        dojo.xhrPost({
            url: "/workspace/login", //'/wbSetName',
            content: {
                //wbId: whiteboard.wbId,
                userName: unt.getValue()
            },
            load: function(resp){
                console.log("post response",resp);
                if(resp.error){
                    unm.innerHTML = '<b>Error: ' + resp.error + '</b><br>Please try again.';
                    unb.setAttribute('disabled',false);
                    unt.setAttribute('disabled',false);
                }else{
                    window.location.href = "/workspace/"+resp.workspaceId;
                }
            },
            error: function(e){
                console.info("post error",e);
                unm.innerHTML = '<b>Error: ' + e + '</b><br>Please try again.';
                unb.setAttribute('disabled',false);
                unt.setAttribute('disabled',false);
            },
            handleAs: "json",
            preventCache: true
        });
    }
};

dojo.addOnLoad(function() {
    console.log('onLoad');

    if (userName) {
        dijit.byId("userNameText").setValue(userName);
        submitUserName();
    } else {
        dojo.connect(dijit.byId('userNameBtn'),'onClick',submitUserName);
        dojo.byId('setUserDiv').style.display = '';
        dojo.connect(dijit.byId("userNameText"), 'onKeyDown', function(evt) {
            if(evt.keyCode === dojo.keys.ENTER) {
                submitUserName();
            }
        });
    }
});