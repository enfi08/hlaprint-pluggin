public with sharing class HlaPrintPublicLinkUtil {
    public class PublicLink { public String url; public String downloadUrl; public String mime; public String filename; }

    public static PublicLink makePublic(Id contentVersionId, Integer expireHours) {
        ContentVersion cv = [
            SELECT Id, ContentDocumentId, Title, FileExtension
            FROM ContentVersion
            WHERE Id = :contentVersionId
            LIMIT 1
        ];

        ContentDistribution dist;
        try {
            dist = buildAndInsertDistribution(cv, expireHours);
        } catch (DmlException e) {
            if (String.valueOf(e).contains('ExpiryDate')) {
                dist = buildAndInsertDistribution(cv, null);
            } else {
                throw e;
            }
        }

        // Re-query so URL fields are populated
        dist = [
            SELECT Id, DistributionPublicUrl, ContentDownloadUrl
            FROM ContentDistribution
            WHERE Id = :dist.Id
            LIMIT 1
        ];

        // *** Use the direct binary URL as-is ***
        String download = dist.ContentDownloadUrl;
        if (String.isBlank(download)) {
            // fallback to landing page if org doesn't populate ContentDownloadUrl
            download = dist.DistributionPublicUrl;
        }
        if (String.isBlank(download)) {
            throw new CalloutException('Public link not generated. Ensure user has "Create Public Links" permission.');
        }

        PublicLink out = new PublicLink();
        out.url = dist.DistributionPublicUrl;      // human landing page
        out.downloadUrl = download;                // direct file (HEAD returns real MIME)
        out.mime = mimeFromExt(cv.FileExtension);
        out.filename = safeFileName(cv.Title, cv.FileExtension, 64);
        return out;
    }

    private static ContentDistribution buildAndInsertDistribution(ContentVersion cv, Integer expireHours) {
        ContentDistribution dist = new ContentDistribution();
        dist.Name = cv.Title;
        dist.ContentVersionId = cv.Id;
        dist.PreferencesAllowViewInBrowser = true;
        dist.PreferencesAllowOriginalDownload = true;
        dist.PreferencesNotifyOnVisit = false;
        dist.PreferencesLinkLatestVersion = false;
        if (expireHours != null && expireHours > 0) {
            Integer days = (Integer)Math.max(1, Math.ceil((Decimal)expireHours / 24));
            dist.ExpiryDate = Date.today().addDays(days);
        }
        insert dist;
        return dist;
    }

    private static String mimeFromExt(String ext) {
        Map<String,String> m = new Map<String,String>{
            'pdf'=>'application/pdf','png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg',
            'doc'=>'application/msword','docx'=>'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls'=>'application/vnd.ms-excel','xlsx'=>'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv'=>'text/csv','txt'=>'text/plain','odt'=>'application/vnd.oasis.opendocument.text'
        };
        return m.get(ext != null ? ext.toLowerCase() : 'pdf');
    }

    private static String safeFileName(String title, String ext, Integer maxBaseLen) {
        String base = (title == null) ? 'file' : title.replaceAll('[^A-Za-z0-9._-]','_');
        if (base.length() > maxBaseLen) base = base.substring(0, maxBaseLen);
        String e = (ext == null) ? 'pdf' : ext.toLowerCase();
        return base + '.' + e;
    }
}