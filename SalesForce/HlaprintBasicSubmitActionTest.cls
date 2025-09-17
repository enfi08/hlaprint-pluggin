@IsTest
private class HlaPrintBasicSubmitActionTest {
    private class Mock implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse r = new HttpResponse(); r.setStatusCode(200);
            if (req.getEndpoint().endsWith('/api/login')) {
                r.setBody('{"token":"t-abc"}');
            } else {
                // Body doesn't matter for the transaction_id assertion anymore
                r.setBody('{"message":"Print jobs created successfully","transaction_id":"456","code":"9999"}');
            }
            return r;
        }
    }

    @IsTest
    static void invocableRoundTrip() {
        // Org-default creds so client doesn't throw
        insert new HlaPrint_Credentials__c(
            SetupOwnerId = UserInfo.getOrganizationId(),
            Email__c='flow@test.com', Password__c='pw'
        );

        // Minimal file to share
        ContentVersion cv = new ContentVersion(
            Title='FlowDoc',
            PathOnClient='FlowDoc.pdf',
            VersionData=Blob.valueOf('x'),
            IsMajorVersion=true
        );
        insert cv;

        Test.setMock(HttpCalloutMock.class, new Mock());
        Test.startTest();
        HlaPrintBasicSubmitAction.Request rq = new HlaPrintBasicSubmitAction.Request();
        rq.device_name='DEV-TEST';
        rq.printer_name='HP Deskjet';
        rq.contentVersionId=cv.Id;
        rq.page_size='A4'; rq.copies=1; rq.page_orientation='auto';

        List<HlaPrintBasicSubmitAction.Response> res =
            HlaPrintBasicSubmitAction.run(new List<HlaPrintBasicSubmitAction.Request>{ rq });
        Test.stopTest();

        System.assertEquals(1, res.size());
        System.assertEquals('Queued HlaPrint submission', res[0].message);

       
        System.assert(!String.isBlank(res[0].transaction_id), 'transaction_id should be populated');
      
    }
}