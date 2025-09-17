global with sharing class HlaPrintBasicSubmitAction {
    public class Request {
        @InvocableVariable(required=true) public String device_name;
        @InvocableVariable public String printer_name;
        @InvocableVariable(required=true) public Id contentVersionId;
        @InvocableVariable public Boolean color;
        @InvocableVariable public Boolean double_sided;
        @InvocableVariable public Integer pages_start;
        @InvocableVariable public Integer page_end;
        @InvocableVariable public String page_size;
        @InvocableVariable public Integer copies;
        @InvocableVariable public String page_orientation;
        @InvocableVariable public Integer link_expire_hours;
    }
    public class Response {
        @InvocableVariable public String message;
        @InvocableVariable public String transaction_id; // Apex Queue Job Id
        @InvocableVariable public String code;           // not used anymore
    }

    @InvocableMethod(
        label='HlaPrint (Basic): Submit'
    )
    public static List<Response> run(List<Request> reqs) {
        List<Response> out = new List<Response>();
        for (Request rq : reqs) {
          
            if (String.isBlank(rq.device_name)) {
                throw new CalloutException('device_name is required.');
            }
            if (rq.device_name.length() > 23) {
                throw new CalloutException('device_name must be <= 23 chars.');
            }
            if (rq.contentVersionId == null) {
                throw new CalloutException('contentVersionId is required.');
            }

           //Public link creation
            HlaPrintPublicLinkUtil.PublicLink link =
                HlaPrintPublicLinkUtil.makePublic(rq.contentVersionId, rq.link_expire_hours);

            String dl = (link.downloadUrl != null && link.downloadUrl != '')
                ? link.downloadUrl
                : link.url;

            Id jobId = System.enqueueJob(
                new HlaPrintSubmitJobQueueableFull(
                    rq.device_name,
                    rq.printer_name,
                    dl,
                    rq.color,
                    rq.double_sided,
                    rq.pages_start,
                    rq.page_end,
                    rq.page_size,
                    rq.copies,
                    rq.page_orientation
                )
            );

           
            Response res = new Response();
            res.message = 'Queued HlaPrint submission';
            res.transaction_id = String.valueOf(jobId);
            res.code = null;
            out.add(res);
        }
        return out;
    }
}