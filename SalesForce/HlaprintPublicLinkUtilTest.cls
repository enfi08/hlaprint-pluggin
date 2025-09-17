@IsTest
private class HlaPrintPublicLinkUtilTest {
    @IsTest
    static void makePublicReturnsDownloadUrl() {
        
        ContentVersion cv = new ContentVersion(
            Title='SampleDoc',
            PathOnClient='SampleDoc.pdf',
            VersionData=Blob.valueOf('hello world'),
            IsMajorVersion=true
        );
        insert cv;
        cv = [SELECT Id FROM ContentVersion WHERE Id = :cv.Id];

        HlaPrintPublicLinkUtil.PublicLink link = HlaPrintPublicLinkUtil.makePublic(cv.Id, 24);
        System.assertNotEquals(null, link);
        System.assert(!String.isBlank(link.downloadUrl), 'downloadUrl should be populated');
        System.assert(!String.isBlank(link.url), 'public url should be populated');
    }
}