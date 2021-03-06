package com.azprogrammer.qgf.model;



import javax.jdo.JDOHelper;
import javax.jdo.PersistenceManagerFactory;

/**
 * @author moishel@google.com (Your Name Here)
 *
 */
public final class PMF {
    private static final PersistenceManagerFactory pmfInstance =
        JDOHelper.getPersistenceManagerFactory("transactions-optional");

    private PMF() {}

    public static PersistenceManagerFactory get() {
        return pmfInstance;
    }
}