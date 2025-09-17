@IsTest
private class HlaPrintBasicClientTest {
  
    private class Mock implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse r = new HttpResponse(); r.setStatusCode(200);
            if (req.getEndpoint().endsWith('/api/login')) {
                r.setBody('{"token":"t-abc"}');
            } else if (req.getEndpoint().endsWith('/api/createPrintjob')) {
                r.setBody('{"message":"Print jobs created successfully","transaction_id":"123","code":"4567"}');
            } else {
                r.setBody('{}');
            }
            return r;
        }
    }

    @IsTest
    static void loginAndSubmit() {
        
        HlaPrint_Credentials__c cs = new HlaPrint_Credentials__c(
            SetupOwnerId = UserInfo.getOrganizationId(),  
            Email__c     = 'test@example.com',
            Password__c  = 'secret'
        );
        insert cs;

       
        Test.setMock(HttpCalloutMock.class, new Mock());

        Test.startTest();

        
        String t = HlaPrintBasicClient.ensureToken();
        System.assertEquals('t-abc', t);

       
        HlaPrintBasicClient.PrintItem it = new HlaPrintBasicClient.PrintItem();
        it.filename = 'https://example.com/file.pdf';
        it.color = false; it.double_sided = false; it.pages_start = 1;
        it.page_size = 'A4'; it.copies = 1; it.page_orientation = 'auto';

        HlaPrintBasicClient.PrintReq p = new HlaPrintBasicClient.PrintReq();
        p.device_name = 'DEV-TEST';
        p.printer_name = 'Any';
        p.print_files = new List<HlaPrintBasicClient.PrintItem>{ it };

        String raw = HlaPrintBasicClient.submitBasic(p);
        System.assert(raw.contains('Print jobs created successfully'));

        Test.stopTest();
    }
}