<!-- Print Code Modal -->
<div id="printCodeModal" class="modal" style="display: none;">
    <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
            <h3>Print Product Code</h3>
            <button type="button" class="modal-close" id="closePrintCodeModal">&times;</button>
        </div>
        <div class="modal-body" style="text-align: center;">
            <div id="printCodeContent"></div>
            <div style="margin-top: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Copies:</label>
                <input type="number" id="printCopies" value="1" min="1" max="100" style="width: 100px; text-align: center;">
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancelPrintCode">Cancel</button>
            <button type="button" class="btn btn-primary" id="confirmPrintCode">Print</button>
        </div>
    </div>
</div>
