global class HlaPrintSubmitJobQueueableFull implements Queueable, Database.AllowsCallouts {
    private final String deviceName;
    private final String printerName;
    private final String fileUrl;

    private final Boolean color;
    private final Boolean doubleSided;
    private final Integer pagesStart;
    private final Integer pageEnd;
    private final String pageSize;
    private final Integer copies;
    private final String pageOrientation;

    public HlaPrintSubmitJobQueueableFull(
        String deviceName,
        String printerName,
        String fileUrl,
        Boolean color,
        Boolean doubleSided,
        Integer pagesStart,
        Integer pageEnd,
        String pageSize,
        Integer copies,
        String pageOrientation
    ) {
        this.deviceName = deviceName;
        this.printerName = printerName;
        this.fileUrl = fileUrl;
        this.color = color;
        this.doubleSided = doubleSided;
        this.pagesStart = pagesStart;
        this.pageEnd = pageEnd;
        this.pageSize = pageSize;
        this.copies = copies;
        this.pageOrientation = pageOrientation;
    }

    public void execute(QueueableContext qc) {
        
        HlaPrintBasicClient.PrintItem item = new HlaPrintBasicClient.PrintItem();
        item.filename = fileUrl;
        item.color = (color == null) ? false : color;
        item.double_sided = (doubleSided == null) ? false : doubleSided;
        item.pages_start = (pagesStart == null) ? 1 : pagesStart;
        item.page_end = pageEnd; // may be null
        item.page_size = String.isBlank(pageSize) ? 'A4' : pageSize;
        item.copies = (copies == null) ? 1 : copies;
        item.page_orientation = String.isBlank(pageOrientation) ? 'auto' : pageOrientation;

        HlaPrintBasicClient.PrintReq payload = new HlaPrintBasicClient.PrintReq();
        payload.device_name = deviceName;
        payload.printer_name = printerName;
        payload.print_files = new List<HlaPrintBasicClient.PrintItem>{ item };

       
        String raw = HlaPrintBasicClient.submitBasic(payload);
        System.debug('HlaPrint response: ' + raw);
        
    }
}