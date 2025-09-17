public with sharing class HlaPrintBasicClient {
   
    public class LoginReq { public String email; public String password; }
    public class LoginResp { public String token; }

    public class PrintItem {
        public String filename;           
        public Boolean color;
        public Boolean double_sided;
        public Integer pages_start;
        public Integer page_end;
        public String page_size;          // A4, A3, Letter
        public Integer copies;
        public String page_orientation;   // auto, portrait, landscape
    }
    public class PrintReq {
        public String device_name;
        public String printer_name;
        public List<PrintItem> print_files;
    }

    
    private static String baseUrl() {
        HlaPrint_Config__mdt cfg = HlaPrint_Config__mdt.getInstance('Default');
        String url = (cfg != null && String.isNotBlank(cfg.BaseUrl__c))
            ? cfg.BaseUrl__c : 'https://hlaprint.com';
        if (url.endsWith('/')) url = url.substring(0, url.length()-1);
        return url;
    }

    
    private static HlaPrint_Credentials__c creds() {
      
        HlaPrint_Credentials__c c = HlaPrint_Credentials__c.getOrgDefaults();
        if (c == null) throw new CalloutException(
            'Missing HlaPrint credentials. Set Custom Setting HlaPrint_Credentials__c (Email__c, Password__c).');
        if (String.isBlank(c.Email__c) || String.isBlank(c.Password__c)) throw new CalloutException(
            'HlaPrint credentials incomplete. Provide both Email__c and Password__c in HlaPrint_Credentials__c.');
        return c;
    }

 
    private static String token;
    public static void clearToken() { token = null; }

    public static String ensureToken() {
        if (token != null) return token;

        HttpRequest r = new HttpRequest();
        r.setEndpoint(baseUrl() + '/api/login');
        r.setMethod('POST');
        r.setHeader('Content-Type','application/json');

        LoginReq body = new LoginReq();
        HlaPrint_Credentials__c c = creds();
        body.email = c.Email__c;
        body.password = c.Password__c;
        r.setBody(JSON.serialize(body));

        HttpResponse resp = new Http().send(r);
        if (resp.getStatusCode() >= 200 && resp.getStatusCode() < 300) {
            LoginResp lr = (LoginResp) JSON.deserialize(resp.getBody(), LoginResp.class);
            if (lr == null || String.isBlank(lr.token)) {
                throw new CalloutException('Login OK but no token in response.');
            }
            token = lr.token;
            return token;
        }
        throw new CalloutException('Login failed: ' + resp.getStatus() + ' ' + resp.getBody());
    }

    public static String submitBasic(PrintReq payload) {
        String tok = ensureToken();

        HttpRequest r = new HttpRequest();
        r.setEndpoint(baseUrl() + '/api/createPrintjob');
        r.setMethod('POST');
        r.setHeader('Content-Type','application/json');
        r.setHeader('Authorization','Bearer ' + tok);
        r.setTimeout(120000);
        r.setBody(JSON.serialize(payload));

        HttpResponse resp = new Http().send(r);

   
        if (resp.getStatusCode() == 401) {
            clearToken();
            tok = ensureToken();
            r.setHeader('Authorization','Bearer ' + tok);
            resp = new Http().send(r);
        }

        if (resp.getStatusCode() >= 200 && resp.getStatusCode() < 300) return resp.getBody();
        throw new CalloutException('createPrintjob failed: ' + resp.getStatus() + ' ' + resp.getBody());
    }
}