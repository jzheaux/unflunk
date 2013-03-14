<%--<div dojoType="dijit.layout.ContentPane" style="padding:0; height: 800px;" closable="true" id="${worksheetId}">--%>
<!-- Draw Area -->
    draw:
    <div>
        <div class="whiteboardContainer" style="border: 2px blue solid; background-color: white;"></div>
        <div class="whiteboardOverlayContainer"  style="border: 2px black solid; z-index : 1;"></div>
    </div>
    <form onsubmit="return false" dojoType="dijit.form.Form" class="toolForm">

        <button dojoType="dijit.form.Button" class="penToolBtn"><img border="0" src="/images/pencil.png"></button>
        <div dojoType="dijit.Tooltip" connectId="penToolBtn" position="above" showDelay="0">Pencil<br>(freehand drawing)</div>

        <button dojoType="dijit.form.Button" class="lineToolBtn"><img border="0" src="/images/line.png"></button>
        <div dojoType="dijit.Tooltip" connectId="lineToolBtn" position="above" showDelay="0">Straight Line</div>

        <button dojoType="dijit.form.Button" class="rectToolBtn"><img border="0" src="/images/rect.png"></button>
        <div dojoType="dijit.Tooltip" connectId="rectToolBtn" position="above" showDelay="0">Rectangle</div>

        <button dojoType="dijit.form.Button" class="filledRectToolBtn"><img border="0" src="/images/filledRect.png"></button>
        <div dojoType="dijit.Tooltip" connectId="filledRectToolBtn" position="above" showDelay="0">Filled Rectangle</div>

        <button dojoType="dijit.form.Button" class="ellipseToolBtn"><img border="0" src="/images/ellipse.png"></button>
        <div dojoType="dijit.Tooltip" connectId="ellipseToolBtn" position="above" showDelay="0">Ellipse</div>

        <button dojoType="dijit.form.Button" class="filledEllipseToolBtn"><img border="0" src="/images/filledEllipse.png"></button>
        <div dojoType="dijit.Tooltip" connectId="filledEllipseToolBtn" position="above" showDelay="0">Filled Ellipse</div>

        <button dojoType="dijit.form.Button" class="textToolBtn"><img border="0" src="/images/text.png"></button>
        <div dojoType="dijit.Tooltip" connectId="textToolBtn" position="above" showDelay="0">Draw Text</div>

        <button dojoType="dijit.form.Button" class="moveToolBtn"><img border="0" src="/images/move.png"></button>
        <div dojoType="dijit.Tooltip" connectId="moveToolBtn" position="above" showDelay="0">Move a shape</div>

        <button dojoType="dijit.form.Button" class="moveUpToolBtn"><img border="0" src="/images/moveUp.png"></button>
        <div dojoType="dijit.Tooltip" connectId="moveUpToolBtn" position="above" showDelay="0">Pull a shape forward</div>

        <button dojoType="dijit.form.Button" class="moveDownToolBtn"><img border="0" src="/images/moveDown.png"></button>
        <div dojoType="dijit.Tooltip" connectId="moveDownToolBtn" position="above" showDelay="0">Push a shape back</div>

        <button dojoType="dijit.form.Button" class="deleteToolBtn"><img border="0" src="/images/delete.png"></button>
        <div dojoType="dijit.Tooltip" connectId="deleteToolBtn" position="above" showDelay="0">Delete a shape</div>

        <br>

        <div class="lineColorDisplay" style="background-color: #FFFFFF; border-color: black; border-width: 1px;" dojoType="dijit.form.DropDownButton">
            <span class="colorText">color <span class="lineSwatch" style="height: 10px; width: 10px; border: 1px solid black; background-color: black;">&nbsp;&nbsp;</span></span>
            <div dojoType="dijit.TooltipDialog" class="lineColorPaletteDialog  ${worksheetId}" title="Color Palette">
                <div dojoType="dojox.widget.ColorPicker" class="lineColorPaletteWidget  ${worksheetId}"></div>
                <button dojoType="dijit.form.Button" class="lineColorPaletteOkBtn  ${worksheetId}">OK</button>
                <button dojoType="dijit.form.Button" class="lineColorPaletteCancelBtn  ${worksheetId}">Cancel</button>
            </div>
        </div>
        <div class="fillColorDisplay" style="background-color: #FFFFFF; border-color: black; border-width: 1px;" dojoType="dijit.form.DropDownButton">
            <span class="colorText">fill <span class="fillSwatch" style="height: 10px; width: 10px; border: 1px solid black; background-color: white;">&nbsp;&nbsp;</span></span>
            <div dojoType="dijit.TooltipDialog" class="fillColorPaletteDialog  ${worksheetId}" title="Color Palette">
                <div dojoType="dojox.widget.ColorPicker" class="fillColorPaletteWidget  ${worksheetId}"></div>
                <button dojoType="dijit.form.Button" class="fillColorPaletteOkBtn  ${worksheetId}">OK</button>
                <button dojoType="dijit.form.Button" class="fillColorPaletteCancelBtn  ${worksheetId}">Cancel</button>
            </div>
        </div>
        <select name="select" dojoType="dijit.form.Select" class="lineStrokeSelect">
            <option value="1">Line Thicknes:  1</option>
            <option value="2">Line Thicknes:  2</option>
            <option value="3" selected="selected">Line Thicknes:  3</option>
            <option value="4">Line Thicknes:  4</option>
            <option value="5">Line Thicknes:  5</option>
            <option value="6">Line Thicknes:  6</option>
            <option value="7">Line Thicknes:  7</option>
            <option value="8">Line Thicknes:  8</option>
            <option value="9">Line Thicknes:  9</option>
            <option value="10">Line Thicknes: 10</option>
            <option value="15">Line Thicknes: 15</option>
            <option value="20">Line Thicknes: 20</option>
            <option value="30">Line Thicknes: 30</option>
            <option value="50">Line Thicknes: 50</option>
            <option value="75">Line Thicknes: 75</option>
            <option value="100">Line Thicknes:100</option>
        </select>
        <select name="select" dojoType="dijit.form.Select" class="fontSizeSelect">
            <option value="5">Font:  5pt</option>
            <option value="6">Font:  6pt</option>
            <option value="7">Font:  7pt</option>
            <option value="8">Font:  8pt</option>
            <option value="9">Font:  9pt</option>
            <option value="10">Font: 10pt</option>
            <option value="12" selected="selected">Font: 12pt</option>
            <option value="14">Font: 14pt</option>
            <option value="16">Font: 16pt</option>
            <option value="20">Font: 20pt</option>
            <option value="24">Font: 24pt</option>
            <option value="32">Font: 32pt</option>
            <option value="48">Font: 48pt</option>
            <option value="64">Font: 64pt</option>
        </select>

        <button dojoType="dijit.form.Button" class="exportImgBtn"><img src="/images/export-icon.png"></button>
        <div dojoType="dijit.Tooltip" connectId="exportImgBtn" position="below" showDelay="0">Export the drawing surface.</div>

        <button dojoType="dijit.form.Button" class="showMovieBtn"><img src="/images/movie-icon.png"></button>
        <div dojoType="dijit.Tooltip" connectId="showMovieBtn" position="below" showDelay="0">View all steps that made this drawing.</div>

        <div class="clearDrawingDisplay" dojoType="dijit.form.DropDownButton">
            <span class="colorText">clear</span>
            <div dojoType="dijit.TooltipDialog" class="clearDrawingDialog ${worksheetId}" title="Clear Drawing">
                Clear Drawing?<br>
                <button class="clearDrawingYesBtn  ${worksheetId}" dojoType="dijit.form.Button">Yes</button> &nbsp;&nbsp;&nbsp;
                <button class="clearDrawingNoBtn  ${worksheetId}" dojoType="dijit.form.Button">No</button>
            </div>
        </div>
    </form>
<%--</div>--%>