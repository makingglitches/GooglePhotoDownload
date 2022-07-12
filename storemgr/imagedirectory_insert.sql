INSERT INTO ImageDirectories (
                                 Name,
                                 MountPointUUID,
                                 SubVolumeId,
                                 SubVolumePath,
                                 Directory,
                                 Active,
                                 TrustedStore,
                                 OriginalStore,
                                 ServerOnlyOrganizer,
                                 UserSpecific,
                                 UserId,
                                 Main
                             )
                             VALUES ( ?, ?, ? , ?,?, ?, ? , ?,?, ?, ? , ?)
                                      
    