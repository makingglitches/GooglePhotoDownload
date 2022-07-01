INSERT or ignore INTO ImageDirectories (
                                 Name,
                                 MountPointUUID,
                                 Directory,
                                 Active,
                                 TrustedStore,
                                 OriginalStore,
                                 ServerOnlyOrganizer,
                                 UserSpecific,
                                 UserId,
                                 Main
                             )
                             VALUES (?, ?, ? ,?, ? , ? ,?, ?,?,?)